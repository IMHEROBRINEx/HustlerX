import { NextResponse } from 'next/server';
import {
  disconnectLinkedInAccount,
  getTrussConnectAccountStatus,
  upsertLinkedInAccountConnection,
} from '@/lib/truss-connect-store';
import { getAuthenticatedUser } from '@/lib/auth-user';
import {
  getUnipileConfiguration,
  listUnipileAccounts,
  UnipileApiError,
} from '@/lib/unipile';
import { accountBelongsToUser } from '@/lib/unipile-account-match';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const currentStatus = await getTrussConnectAccountStatus(userId);

    const configuration = getUnipileConfiguration();
    let warning: string | undefined;

    if (configuration.configured) {
      try {
        const accounts = await listUnipileAccounts();
        const linkedInAccounts = accounts.filter((account) => {
          const provider = (account.provider || '').toLowerCase();
          const type = (account.type || '').toLowerCase();
          return provider.includes('linkedin') || type.includes('linkedin');
        });

        const connectedAccountStillExists = currentStatus.accountId
          ? linkedInAccounts.find((account) => account.id === currentStatus.accountId)
          : undefined;

        const linkedInAccount = accounts.find((account) => {
          const provider = (account.provider || '').toLowerCase();
          const type = (account.type || '').toLowerCase();
          const isLinkedIn = provider.includes('linkedin') || type.includes('linkedin');
          const belongsToUser = accountBelongsToUser(account, user);
          return isLinkedIn && belongsToUser;
        });

        const selectedAccountId =
          connectedAccountStillExists?.id ||
          linkedInAccount?.id ||
          (linkedInAccounts.length === 1 ? linkedInAccounts[0].id : undefined);

        if (!connectedAccountStillExists?.id && !linkedInAccount?.id && linkedInAccounts.length === 1) {
          warning = 'Matched the only available LinkedIn account in Unipile for this workspace.';
        }

        if (selectedAccountId) {
          await upsertLinkedInAccountConnection({
            userId,
            accountId: selectedAccountId,
            status: 'CONNECTED',
          });
        } else if (currentStatus.connected) {
          await disconnectLinkedInAccount(userId);
          warning =
            'Previous LinkedIn mapping no longer exists in the current Unipile workspace. Reconnect LinkedIn for this account.';
        }
      } catch (error) {
        if (error instanceof UnipileApiError) {
          warning = `Could not refresh account from Unipile: ${error.message}`;
        } else if (error instanceof Error) {
          warning = `Could not refresh account from Unipile: ${error.message}`;
        } else {
          warning = 'Could not refresh account from Unipile.';
        }
      }
    }

    const accountStatus = await getTrussConnectAccountStatus(userId);

    return NextResponse.json({
      success: true,
      accountStatus,
      configuration: {
        configured: configuration.configured,
        missing: configuration.missing,
        baseUrl: configuration.baseUrl,
        setupHint: configuration.setupHint,
      },
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    console.error('Failed to load HustlerX Connect account status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown status error',
      },
      { status: 500 },
    );
  }
}
