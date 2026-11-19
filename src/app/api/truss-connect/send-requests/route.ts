import { NextRequest, NextResponse } from 'next/server';
import {
  appendSendResults,
  getDailySendLimit,
  getTrussConnectAccountStatus,
  hasSentRecipientAlready,
  normalizeRecipientKey,
  upsertLinkedInAccountConnection,
} from '@/lib/truss-connect-store';
import {
  getUnipileConfiguration,
  listUnipileAccounts,
  resolveProviderIdFromLinkedInProfileUrl,
  sendUserInvitation,
  UnipileApiError,
} from '@/lib/unipile';
import { TrussConnectSendResult } from '@/types';
import { AuthenticatedUser, getAuthenticatedUser } from '@/lib/auth-user';
import { accountBelongsToUser } from '@/lib/unipile-account-match';

export const runtime = 'nodejs';
export const maxDuration = 120;
const INVITE_RETRY_DELAYS_MS = [1200, 2500];
const BETWEEN_RECIPIENT_DELAY_MS = 350;

interface RecipientInput {
  candidateId?: string;
  fullName?: string;
  profileUrl?: string;
  userEmail?: string;
  message?: string;
}

interface SendRequestBody {
  accountId?: string;
  recipients?: RecipientInput[];
}

interface AccountResolutionResult {
  accountId?: string;
  configuration: ReturnType<typeof getUnipileConfiguration>;
  error?: string;
  statusCode?: number;
}

function deriveProviderErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const record = data as Record<string, unknown>;

  const messageCandidates = [
    record.error,
    record.message,
    record.detail,
    record.reason,
    record.title,
    record.type,
  ];

  for (const candidate of messageCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}

function isTemporaryProviderLimitText(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('temporary provider limit') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('throttl') ||
    normalized.includes('try again later')
  );
}

function isTemporaryProviderLimitError(error: unknown): boolean {
  if (error instanceof UnipileApiError) {
    if (error.status === 429) {
      return true;
    }

    const reason = deriveProviderErrorMessage(error.details, error.message);
    return isTemporaryProviderLimitText(reason);
  }

  if (error instanceof Error) {
    return isTemporaryProviderLimitText(error.message);
  }

  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendInvitationWithRetry(input: {
  accountId: string;
  providerId: string;
  userEmail?: string;
  message?: string;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= INVITE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await sendUserInvitation(input);
    } catch (error) {
      lastError = error;

      if (!isTemporaryProviderLimitError(error) || attempt === INVITE_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await delay(INVITE_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('provider_send_failed'));
}

function looksLikeLinkedInProviderId(candidateId?: string): boolean {
  if (!candidateId) {
    return false;
  }

  const value = candidateId.trim();
  if (!value) {
    return false;
  }

  return /^(ACo|ACw|AEM|urn:li:)/.test(value);
}

function isLinkedInAccount(account: { provider?: string; type?: string }): boolean {
  const provider = (account.provider || '').toLowerCase();
  const type = (account.type || '').toLowerCase();
  return provider.includes('linkedin') || type.includes('linkedin');
}

async function resolveAccountIdForUser(
  user: AuthenticatedUser,
  preferredAccountId?: string,
): Promise<AccountResolutionResult> {
  const userId = user.id;
  const accountStatus = await getTrussConnectAccountStatus(userId);
  const configuration = getUnipileConfiguration();
  const normalizedPreferredAccountId = preferredAccountId?.trim();

  if (!configuration.configured) {
    return {
      configuration,
      error: `Unipile is not configured. Missing: ${configuration.missing.join(', ')}`,
      statusCode: 400,
    };
  }

  let accounts: Awaited<ReturnType<typeof listUnipileAccounts>> = [];

  try {
    accounts = await listUnipileAccounts();
  } catch {
    // If account listing is temporarily unavailable, keep flow alive using known
    // account context from status state and let send call return provider-level errors.
    const fallbackAccountId = accountStatus.accountId || normalizedPreferredAccountId;

    if (fallbackAccountId) {
      await upsertLinkedInAccountConnection({
        userId,
        accountId: fallbackAccountId,
        status: 'CONNECTED',
      });

      return {
        accountId: fallbackAccountId,
        configuration,
      };
    }

    throw new UnipileApiError('Unable to list Unipile accounts while resolving LinkedIn account', 502);
  }

  const linkedInAccounts = accounts.filter((account) => isLinkedInAccount(account));

  if (normalizedPreferredAccountId) {
    const preferredAccount = linkedInAccounts.find((account) => account.id === normalizedPreferredAccountId);
    if (preferredAccount) {
      await upsertLinkedInAccountConnection({
        userId,
        accountId: preferredAccount.id,
        status: 'CONNECTED',
      });

      return {
        accountId: preferredAccount.id,
        configuration,
      };
    }
  }

  // If we already know an accountId for this user and it still exists in Unipile,
  // prefer that to avoid false negatives from ownership heuristics.
  if (accountStatus.accountId) {
    const statusAccount = linkedInAccounts.find((account) => account.id === accountStatus.accountId);
    if (statusAccount) {
      await upsertLinkedInAccountConnection({
        userId,
        accountId: statusAccount.id,
        status: 'CONNECTED',
      });

      return {
        accountId: statusAccount.id,
        configuration,
      };
    }
  }

  const linkedInAccount = accounts.find((account) => {
    const isLinkedIn = isLinkedInAccount(account);
    const belongsToUser = accountBelongsToUser(account, user);
    return isLinkedIn && belongsToUser;
  });

  // Keep fallback behavior consistent with account-status route:
  // when exactly one LinkedIn account exists in this workspace, use it.
  const singleLinkedInAccount = linkedInAccounts.length === 1 ? linkedInAccounts[0] : undefined;

  const linkedInAccountId = linkedInAccount?.id || singleLinkedInAccount?.id;

  if (!linkedInAccountId) {
    const userOwnedLinkedInAccount = linkedInAccounts.find(
      (account) => (account.name || '').trim().toLowerCase() === userId.toLowerCase(),
    );
    const singleLinkedInAccount = linkedInAccounts.length === 1 ? linkedInAccounts[0] : undefined;
    const accountFromBroadFallback = userOwnedLinkedInAccount?.id || singleLinkedInAccount?.id;

    if (accountFromBroadFallback) {
      await upsertLinkedInAccountConnection({
        userId,
        accountId: accountFromBroadFallback,
        status: 'CONNECTED',
      });

      return {
        accountId: accountFromBroadFallback,
        configuration,
      };
    }

    return {
      configuration,
      error: 'No LinkedIn account found in Unipile. Connect LinkedIn account first.',
      statusCode: 409,
    };
  }

  await upsertLinkedInAccountConnection({
    userId,
    accountId: linkedInAccountId,
    status: 'CONNECTED',
  });

  return {
    accountId: linkedInAccountId,
    configuration,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SendRequestBody;
    const userId = user.id;
    const preferredAccountId = body.accountId?.trim() || undefined;
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 },
      );
    }

    const resolvedAccount = await resolveAccountIdForUser(user, preferredAccountId);
    if (!resolvedAccount.accountId) {
      return NextResponse.json(
        {
          success: false,
          error: resolvedAccount.error || 'LinkedIn account is not connected for this user',
          configuration: {
            configured: resolvedAccount.configuration.configured,
            missing: resolvedAccount.configuration.missing,
            baseUrl: resolvedAccount.configuration.baseUrl,
            setupHint: resolvedAccount.configuration.setupHint,
          },
        },
        { status: resolvedAccount.statusCode || 409 },
      );
    }

    const accountId = resolvedAccount.accountId;

    const accountStatus = await getTrussConnectAccountStatus(userId);

    const dailyLimit = accountStatus.dailyLimit || getDailySendLimit();
    let remainingQuota = accountStatus.remainingToday ?? dailyLimit;

    const seenInBatch = new Set<string>();
    const results: TrussConnectSendResult[] = [];
    let providerTemporarilyLimited = false;

    for (let index = 0; index < recipients.length; index += 1) {
      const recipient = recipients[index];
      const fullName = recipient.fullName?.trim() || 'Unknown Recipient';
      const profileUrl = recipient.profileUrl?.trim() || undefined;
      const recipientKey = normalizeRecipientKey(profileUrl, fullName, recipient.candidateId);

      if (providerTemporarilyLimited) {
        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'skipped',
          reason: 'Provider temporarily limited. Retry this batch in a few minutes.',
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      if (seenInBatch.has(recipientKey)) {
        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'skipped',
          reason: 'duplicate_in_batch',
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      seenInBatch.add(recipientKey);

      if (await hasSentRecipientAlready(userId, recipientKey)) {
        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'skipped',
          reason: 'already_sent',
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      if (remainingQuota <= 0) {
        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'skipped',
          reason: 'daily_limit_reached',
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      let providerId: string | null = looksLikeLinkedInProviderId(recipient.candidateId)
        ? recipient.candidateId?.trim() || null
        : null;

      if (!providerId && profileUrl) {
        try {
          const resolvedProfile = await resolveProviderIdFromLinkedInProfileUrl({
            profileUrl,
            accountId,
          });

          providerId = resolvedProfile.providerId;
        } catch (error) {
          if (error instanceof UnipileApiError) {
            const reason = deriveProviderErrorMessage(error.details, error.message);
            if (isTemporaryProviderLimitText(reason)) {
              providerTemporarilyLimited = true;
            }

            results.push({
              recipientKey,
              fullName,
              profileUrl,
              status: 'failed',
              reason,
              sentAt: new Date().toISOString(),
            });
            continue;
          }

          results.push({
            recipientKey,
            fullName,
            profileUrl,
            status: 'failed',
            reason: error instanceof Error ? error.message : 'provider_id_resolution_failed',
            sentAt: new Date().toISOString(),
          });
          continue;
        }
      }

      if (!providerId) {
        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'failed',
          reason: profileUrl ? 'provider_id_not_found' : 'missing_profile_url',
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const invitation = await sendInvitationWithRetry({
          accountId,
          providerId,
          userEmail: recipient.userEmail,
          message: recipient.message,
        });

        remainingQuota -= 1;

        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'sent',
          externalRequestId: invitation.invitationId,
          sentAt: new Date().toISOString(),
        });

        if (index < recipients.length - 1) {
          await delay(BETWEEN_RECIPIENT_DELAY_MS);
        }
      } catch (error) {
        if (error instanceof UnipileApiError) {
          const reason = deriveProviderErrorMessage(error.details, error.message);
          if (isTemporaryProviderLimitText(reason)) {
            providerTemporarilyLimited = true;
          }

          results.push({
            recipientKey,
            fullName,
            profileUrl,
            status: 'failed',
            reason,
            sentAt: new Date().toISOString(),
          });
          continue;
        }

        results.push({
          recipientKey,
          fullName,
          profileUrl,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'provider_send_failed',
          sentAt: new Date().toISOString(),
        });
        continue;
      }
    }

    await appendSendResults(userId, results);

    const sent = results.filter((result) => result.status === 'sent').length;
    const failed = results.filter((result) => result.status === 'failed').length;
    const skipped = results.filter((result) => result.status === 'skipped').length;

    const refreshedStatus = await getTrussConnectAccountStatus(userId);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        requested: recipients.length,
        sent,
        failed,
        skipped,
        dailyLimit,
        remainingDailyQuota: refreshedStatus.remainingToday ?? 0,
      },
      configuration: {
        configured: resolvedAccount.configuration.configured,
        missing: resolvedAccount.configuration.missing,
        baseUrl: resolvedAccount.configuration.baseUrl,
        setupHint: resolvedAccount.configuration.setupHint,
      },
    });
  } catch (error) {
    console.error('HustlerX Connect send requests failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown send error',
      },
      { status: 500 },
    );
  }
}
