import { NextRequest, NextResponse } from 'next/server';
import { createHostedAuthLink, getUnipileConfiguration, UnipileApiError } from '@/lib/unipile';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';

interface HostedLinkRequestBody {
  providers?: string[];
  type?: string;
}

interface HostedLinkProviderResponse {
  url?: string;
  expiresOn?: string;
  endpoint?: string;
  mode?: 'live' | 'mock';
  configuration?: {
    configured: boolean;
    missing: string[];
    baseUrl?: string;
    setupHint: string;
  };
  error?: string;
}

function resolveBaseUrl(request: NextRequest): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  const requestOrigin = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.replace(':', '')}://${forwardedHost}`
    : requestUrl.origin;

  const isLocalHost = (hostname: string) =>
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost');

  const requestHostLocal = isLocalHost(new URL(requestOrigin).hostname.toLowerCase());

  // For deployed hosts (including preview domains), always use the incoming request host.
  if (!requestHostLocal) {
    return requestOrigin;
  }

  // In local development, always keep callbacks on the active local origin/port.
  if (process.env.NODE_ENV === 'development') {
    return requestOrigin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!configured || !configured.trim()) {
    return requestOrigin;
  }

  const withProtocol = /^https?:\/\//i.test(configured) ? configured.trim() : `https://${configured.trim()}`;

  try {
    const parsed = new URL(withProtocol);
    if (!isLocalHost(parsed.hostname.toLowerCase())) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Ignore malformed APP_URL values and fall back to request origin.
  }

  return requestOrigin;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as HostedLinkRequestBody;
    const userId = user.id;

    const baseUrl = resolveBaseUrl(request);
    const notifyUrl = `${baseUrl}/api/unipile/notify?uid=${encodeURIComponent(userId)}`;
    const completionPath = '/auth/unipile-complete';
    const successRedirectUrl = `${baseUrl}/api/unipile/notify?uid=${encodeURIComponent(userId)}&status=success&redirect=${encodeURIComponent(`${completionPath}?status=success`)}`;
    const failureRedirectUrl = `${baseUrl}/api/unipile/notify?uid=${encodeURIComponent(userId)}&status=failure&redirect=${encodeURIComponent(`${completionPath}?status=failure`)}`;
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const configuration = getUnipileConfiguration();
    const allowMock = process.env.TRUSS_CONNECT_ALLOW_MOCK === 'true';

    if (!configuration.configured && allowMock) {
      const mockAccountId = `mock-linkedin-${crypto.randomUUID().slice(0, 8)}`;
      const mockLink = new URL(`${baseUrl}/api/unipile/notify`);
      mockLink.searchParams.set('status', 'success');
      mockLink.searchParams.set('account_id', mockAccountId);
      mockLink.searchParams.set('name', userId);
      mockLink.searchParams.set('uid', userId);
      mockLink.searchParams.set('provider', 'LINKEDIN');
      mockLink.searchParams.set('redirect', '/auth/unipile-complete?status=success');

      return NextResponse.json({
        success: true,
        url: mockLink.toString(),
        expiresOn,
        mode: 'mock',
        configuration: {
          configured: configuration.configured,
          missing: configuration.missing,
          baseUrl: configuration.baseUrl,
          setupHint: configuration.setupHint,
        },
      });
    }

    if (!configuration.configured) {
      return NextResponse.json(
        {
          success: false,
          error: `Unipile is not configured. Missing: ${configuration.missing.join(', ')}`,
          configuration: {
            configured: configuration.configured,
            missing: configuration.missing,
            baseUrl: configuration.baseUrl,
            setupHint: configuration.setupHint,
          },
        } as HostedLinkProviderResponse,
        { status: 400 },
      );
    }

    const hostedAuth = await createHostedAuthLink({
      name: userId,
      notifyUrl,
      successRedirectUrl,
      failureRedirectUrl,
      providers: body.providers,
      expiresOn,
    });

    return NextResponse.json({
      success: true,
      url: hostedAuth.url,
      expiresOn: hostedAuth.expiresOn || expiresOn,
      endpoint: hostedAuth.endpoint,
      mode: 'live',
      configuration: {
        configured: configuration.configured,
        missing: configuration.missing,
        baseUrl: configuration.baseUrl,
        setupHint: configuration.setupHint,
      },
    });
  } catch (error) {
    if (error instanceof UnipileApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
        },
        { status: error.status || 500 },
      );
    }

    console.error('Hosted link generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown hosted link error',
      },
      { status: 500 },
    );
  }
}
