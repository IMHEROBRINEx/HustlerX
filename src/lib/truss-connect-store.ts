/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { TrussConnectAccountStatus, TrussConnectSendResult } from '@/types';

const DAILY_SEND_LIMIT = 25;

type AccountProvider = 'LINKEDIN';

type AccountConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING' | 'FAILED';

interface LinkedAccountRecord {
  userId: string;
  provider: AccountProvider;
  accountId: string;
  status: AccountConnectionStatus;
  connectedAt: string;
  updatedAt: string;
}

interface SendLogRecord extends TrussConnectSendResult {
  userId: string;
  dateKey: string;
}

interface DbAccountRow {
  provider: string | null;
  account_id: string | null;
  status: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

const accountByUserId = new Map<string, LinkedAccountRecord>();
const sendLogByUserId = new Map<string, SendLogRecord[]>();

function dateKeyFromIso(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

function buildStatus(userId: string, account: {
  provider?: AccountProvider;
  accountId?: string;
  status?: string;
  connectedAt?: string;
  updatedAt?: string;
} | null, sentToday: number): TrussConnectAccountStatus {
  const remainingToday = Math.max(DAILY_SEND_LIMIT - sentToday, 0);

  if (!account || account.status !== 'CONNECTED' || !account.accountId) {
    return {
      connected: false,
      userId,
      provider: 'LINKEDIN',
      status: account?.status || 'DISCONNECTED',
      updatedAt: account?.updatedAt,
      sentToday,
      dailyLimit: DAILY_SEND_LIMIT,
      remainingToday,
    };
  }

  return {
    connected: true,
    userId,
    provider: account.provider || 'LINKEDIN',
    accountId: account.accountId,
    status: account.status,
    connectedAt: account.connectedAt,
    updatedAt: account.updatedAt,
    sentToday,
    dailyLimit: DAILY_SEND_LIMIT,
    remainingToday,
  };
}

function logFallback(functionName: string, error: unknown): void {
  console.warn(`[truss-connect-store] Falling back to in-memory mode in ${functionName}:`, error);
}

async function getDbAccountRow(userId: string): Promise<DbAccountRow | null> {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from('truss_connect_accounts')
    .select('provider, account_id, status, connected_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as DbAccountRow | null;
}

async function getDbSentTodayCount(userId: string): Promise<number> {
  const today = dateKeyFromIso(new Date().toISOString());
  const supabase = getSupabaseAdminClient() as any;

  const { count, error } = await supabase
    .from('truss_connect_send_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .eq('date_key', today);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function getUserSendLogs(userId: string): SendLogRecord[] {
  const existing = sendLogByUserId.get(userId);
  if (existing) {
    return existing;
  }

  const initial: SendLogRecord[] = [];
  sendLogByUserId.set(userId, initial);
  return initial;
}

function countSentToday(userId: string): number {
  const todayKey = dateKeyFromIso(new Date().toISOString());
  const logs = getUserSendLogs(userId);

  return logs.reduce((count, record) => {
    if (record.dateKey === todayKey && record.status === 'sent') {
      return count + 1;
    }

    return count;
  }, 0);
}

export function normalizeRecipientKey(profileUrl: string | undefined, fullName: string, candidateId?: string): string {
  if (profileUrl && profileUrl.trim()) {
    try {
      const parsed = new URL(profileUrl.trim());
      parsed.search = '';
      parsed.hash = '';
      const normalized = parsed.toString().replace(/\/+$/, '');
      return `url:${normalized.toLowerCase()}`;
    } catch {
      return `url:${profileUrl.trim().toLowerCase()}`;
    }
  }

  if (candidateId && candidateId.trim()) {
    return `id:${candidateId.trim().toLowerCase()}`;
  }

  return `name:${fullName.trim().toLowerCase()}`;
}

function upsertLinkedInAccountConnectionMemory(input: {
  userId: string;
  accountId: string;
  status?: AccountConnectionStatus;
}): TrussConnectAccountStatus {
  const now = new Date().toISOString();
  const existing = accountByUserId.get(input.userId);

  const nextRecord: LinkedAccountRecord = {
    userId: input.userId,
    provider: 'LINKEDIN',
    accountId: input.accountId,
    status: input.status || 'CONNECTED',
    connectedAt: existing?.connectedAt || now,
    updatedAt: now,
  };

  accountByUserId.set(input.userId, nextRecord);

  return getTrussConnectAccountStatusMemory(input.userId);
}

function disconnectLinkedInAccountMemory(userId: string): TrussConnectAccountStatus {
  const account = accountByUserId.get(userId);
  if (!account) {
    return getTrussConnectAccountStatusMemory(userId);
  }

  accountByUserId.set(userId, {
    ...account,
    status: 'DISCONNECTED',
    updatedAt: new Date().toISOString(),
  });

  return getTrussConnectAccountStatusMemory(userId);
}

function getTrussConnectAccountStatusMemory(userId: string): TrussConnectAccountStatus {
  const account = accountByUserId.get(userId);
  const sentToday = countSentToday(userId);

  return buildStatus(
    userId,
    account
      ? {
          provider: account.provider,
          accountId: account.accountId,
          status: account.status,
          connectedAt: account.connectedAt,
          updatedAt: account.updatedAt,
        }
      : null,
    sentToday,
  );
}

function hasSentRecipientAlreadyMemory(userId: string, recipientKey: string): boolean {
  const logs = getUserSendLogs(userId);
  return logs.some((record) => record.recipientKey === recipientKey && record.status === 'sent');
}

function appendSendResultsMemory(userId: string, results: TrussConnectSendResult[]): void {
  if (results.length === 0) {
    return;
  }

  const logs = getUserSendLogs(userId);

  results.forEach((result) => {
    const sentAt = result.sentAt || new Date().toISOString();

    logs.push({
      ...result,
      userId,
      sentAt,
      dateKey: dateKeyFromIso(sentAt),
    });
  });
}

export async function isLinkedInConnected(userId: string): Promise<boolean> {
  const status = await getTrussConnectAccountStatus(userId);
  return status.connected;
}

export async function upsertLinkedInAccountConnection(input: {
  userId: string;
  accountId: string;
  status?: AccountConnectionStatus;
}): Promise<TrussConnectAccountStatus> {
  const now = new Date().toISOString();

  try {
    const supabase = getSupabaseAdminClient() as any;
    const { data: existing, error: existingError } = await supabase
      .from('truss_connect_accounts')
      .select('connected_at')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const { error } = await supabase.from('truss_connect_accounts').upsert(
      {
        user_id: input.userId,
        provider: 'LINKEDIN',
        account_id: input.accountId,
        status: input.status || 'CONNECTED',
        connected_at: existing?.connected_at || now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw error;
    }

    return await getTrussConnectAccountStatus(input.userId);
  } catch (error) {
    logFallback('upsertLinkedInAccountConnection', error);
    return upsertLinkedInAccountConnectionMemory(input);
  }
}

export async function disconnectLinkedInAccount(userId: string): Promise<TrussConnectAccountStatus> {
  const now = new Date().toISOString();

  try {
    const supabase = getSupabaseAdminClient() as any;
    const { data: existing, error: existingError } = await supabase
      .from('truss_connect_accounts')
      .select('account_id, connected_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const { error } = await supabase.from('truss_connect_accounts').upsert(
      {
        user_id: userId,
        provider: 'LINKEDIN',
        account_id: existing?.account_id || null,
        status: 'DISCONNECTED',
        connected_at: existing?.connected_at || null,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw error;
    }

    return await getTrussConnectAccountStatus(userId);
  } catch (error) {
    logFallback('disconnectLinkedInAccount', error);
    return disconnectLinkedInAccountMemory(userId);
  }
}

export async function getTrussConnectAccountStatus(userId: string): Promise<TrussConnectAccountStatus> {
  try {
    const [account, sentToday] = await Promise.all([
      getDbAccountRow(userId),
      getDbSentTodayCount(userId),
    ]);

    return buildStatus(
      userId,
      account
        ? {
            provider: 'LINKEDIN',
            accountId: account.account_id || undefined,
            status: account.status || undefined,
            connectedAt: account.connected_at || undefined,
            updatedAt: account.updated_at || undefined,
          }
        : null,
      sentToday,
    );
  } catch (error) {
    logFallback('getTrussConnectAccountStatus', error);
    return getTrussConnectAccountStatusMemory(userId);
  }
}

export async function hasSentRecipientAlready(userId: string, recipientKey: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient() as any;
    const { data, error } = await supabase
      .from('truss_connect_send_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('recipient_key', recipientKey)
      .eq('status', 'sent')
      .limit(1);

    if (error) {
      throw error;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    logFallback('hasSentRecipientAlready', error);
    return hasSentRecipientAlreadyMemory(userId, recipientKey);
  }
}

export async function appendSendResults(userId: string, results: TrussConnectSendResult[]): Promise<void> {
  if (results.length === 0) {
    return;
  }

  try {
    const payload = results.map((result) => {
      const sentAt = result.sentAt || new Date().toISOString();

      return {
        user_id: userId,
        recipient_key: result.recipientKey,
        full_name: result.fullName,
        profile_url: result.profileUrl || null,
        status: result.status,
        reason: result.reason || null,
        external_request_id: result.externalRequestId || null,
        sent_at: sentAt,
        date_key: dateKeyFromIso(sentAt),
      };
    });

    const supabase = getSupabaseAdminClient() as any;
    const { error } = await supabase.from('truss_connect_send_logs').insert(payload);

    if (error) {
      throw error;
    }
  } catch (error) {
    logFallback('appendSendResults', error);
    appendSendResultsMemory(userId, results);
  }
}

export function getDailySendLimit(): number {
  return DAILY_SEND_LIMIT;
}
