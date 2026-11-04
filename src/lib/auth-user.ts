import { createServerClient } from '@/lib/supabase-server';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  fullName?: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createServerClient>>['auth']['getUser']>>['data']['user'] | null = null;
  let error: unknown = null;

  try {
    const supabase = await createServerClient();
    const authResponse = await supabase.auth.getUser();
    user = authResponse.data.user;
    error = authResponse.error;
  } catch {
    return null;
  }

  if (error || !user) {
    return null;
  }

  const metadata =
    typeof user.user_metadata === 'object' && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : undefined;

  const metadataFullName =
    typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
        ? metadata.name
        : undefined;

  return {
    id: user.id,
    email: user.email,
    fullName: metadataFullName,
  };
}
