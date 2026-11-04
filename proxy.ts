import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getSafeRedirectPath(candidate: string | null | undefined, fallbackPath = '/dashboard'): string {
  if (!candidate) {
    return fallbackPath;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/')) {
    return fallbackPath;
  }

  if (trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallbackPath;
  }

  return trimmed;
}

function withSupabaseCookies(source: NextResponse, target: NextResponse): NextResponse {
  const setCookieHeader = source.headers.get('set-cookie');
  if (setCookieHeader) {
    target.headers.set('set-cookie', setCookieHeader);
  }

  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });

  return target;
}

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof response.cookies.set>[2];
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isSignInRoute = request.nextUrl.pathname.startsWith('/sign-in');

  if (isDashboardRoute && !user) {
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const redirectUrl = new URL('/sign-in', request.url);
    redirectUrl.searchParams.set('next', requestedPath);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    return withSupabaseCookies(response, redirectResponse);
  }

  if (isSignInRoute && user) {
    const requestedNext = request.nextUrl.searchParams.get('next');
    const targetPath = getSafeRedirectPath(requestedNext, '/dashboard');
    const redirectUrl = new URL(targetPath, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    return withSupabaseCookies(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/sign-in'],
};
