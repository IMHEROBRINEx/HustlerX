import { NextRequest, NextResponse } from 'next/server';
import { disconnectLinkedInAccount, upsertLinkedInAccountConnection } from '@/lib/truss-connect-store';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';

interface NotifyPayload {
  status?: string;
  account_id?: string;
  accountId?: string;
  name?: string;
  uid?: string;
  userId?: string;
  user_id?: string;
  provider?: string;
}

function normalizePayload(raw: unknown): NotifyPayload {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const nested =
    typeof record.data === 'object' && record.data !== null
      ? (record.data as Record<string, unknown>)
      : undefined;

  return {
    status: (record.status as string) || (nested?.status as string) || undefined,
    account_id: (record.account_id as string) || (nested?.account_id as string) || undefined,
    accountId: (record.accountId as string) || (nested?.accountId as string) || undefined,
    name: (record.name as string) || (nested?.name as string) || undefined,
    uid: (record.uid as string) || (nested?.uid as string) || undefined,
    userId: (record.userId as string) || (nested?.userId as string) || undefined,
    user_id: (record.user_id as string) || (nested?.user_id as string) || undefined,
    provider: (record.provider as string) || (nested?.provider as string) || undefined,
  };
}

function isSuccessStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'success' || normalized === 'connected' || normalized === 'ok';
}

function resolveUserId(payload: NotifyPayload, fallbackUserId?: string): string | undefined {
  const candidates = [payload.name, payload.userId, payload.user_id, payload.uid, fallbackUserId];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

async function processNotification(payload: NotifyPayload, fallbackUserId?: string) {
  const userId = resolveUserId(payload, fallbackUserId);
  const status = payload.status?.trim() || 'unknown';
  const accountId = payload.account_id?.trim() || payload.accountId?.trim();

  if (!userId) {
    return {
      ok: false,
      code: 400,
      error: 'Missing user identifier (name)',
    };
  }

  if (isSuccessStatus(status) && accountId) {
    const accountStatus = await upsertLinkedInAccountConnection({
      userId,
      accountId,
      status: 'CONNECTED',
    });

    return {
      ok: true,
      code: 200,
      accountStatus,
      status,
    };
  }

  const accountStatus = await disconnectLinkedInAccount(userId);
  return {
    ok: true,
    code: 200,
    accountStatus,
    status,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = normalizePayload(body);
    const fallbackUserId = request.nextUrl.searchParams.get('uid')?.trim() || undefined;
    const result = await processNotification(payload, fallbackUserId);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.code },
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      accountStatus: result.accountStatus,
    });
  } catch (error) {
    console.error('Unipile notify POST failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown notify POST error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authenticatedUser = await getAuthenticatedUser();
    const searchParams = request.nextUrl.searchParams;
    const payload: NotifyPayload = {
      status: searchParams.get('status') || undefined,
      account_id: searchParams.get('account_id') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      name: searchParams.get('name') || undefined,
      uid: searchParams.get('uid') || undefined,
      userId: searchParams.get('userId') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      provider: searchParams.get('provider') || undefined,
    };

    const fallbackUserId =
      authenticatedUser?.id ||
      searchParams.get('uid') ||
      searchParams.get('userId') ||
      searchParams.get('user_id');

    const payloadForProcessing = authenticatedUser?.id
      ? {
          ...payload,
          name: authenticatedUser.id,
          uid: undefined,
          userId: undefined,
          user_id: undefined,
        }
      : payload;

    const result = await processNotification(payloadForProcessing, fallbackUserId || undefined);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.code },
      );
    }

    const redirectPath = searchParams.get('redirect') || '/dashboard';
    const targetUrl = new URL(redirectPath, request.url);
    targetUrl.searchParams.set('trussConnectStatus', result.status || 'unknown');

    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error('Unipile notify GET failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown notify GET error',
      },
      { status: 500 },
    );
  }
}
