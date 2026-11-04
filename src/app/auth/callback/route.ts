import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function getSafeRedirectPath(candidate: string | null, fallbackPath = '/dashboard'): string {
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get('next'), '/dashboard');

  if (!code) {
    const signInUrl = new URL('/sign-in', requestUrl.origin);
    signInUrl.searchParams.set('next', nextPath);
    signInUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(signInUrl);
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    console.error('Auth callback exchange failed:', error?.message || 'No session returned');
    const signInUrl = new URL('/sign-in', requestUrl.origin);
    signInUrl.searchParams.set('next', nextPath);
    signInUrl.searchParams.set('error', 'auth_callback_failed');
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
