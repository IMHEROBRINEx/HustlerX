export type PageStateScope = 'dashboard' | 'main-dashboard' | 'truss-intelligence' | 'truss-connect';

interface PageStateResponse<T> {
  success: boolean;
  state?: T | null;
  error?: string;
}

export async function loadUserPageState<T>(scope: PageStateScope): Promise<T | null> {
  const response = await fetch(`/api/user/page-state?scope=${encodeURIComponent(scope)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const data = (await response.json()) as PageStateResponse<T>;

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to load page state');
  }

  return (data.state ?? null) as T | null;
}

export async function saveUserPageState<T>(scope: PageStateScope, state: T): Promise<void> {
  const response = await fetch('/api/user/page-state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, state }),
  });

  const data = (await response.json()) as { success?: boolean; error?: string };

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to save page state');
  }
}
