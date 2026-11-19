'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { ExaPeopleDashboard } from '@/components/exa-people-dashboard';
import { JobPostSearchPage } from '@/components/job-post-search-page';
import { createClient } from '@/lib/supabase';
import { loadUserPageState, saveUserPageState } from '@/lib/page-state-client';

type DashboardTab = 'exa-people' | 'job-post-search';

interface PersistedDashboardState {
  activeDashboard?: DashboardTab;
}

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'job-post-search', label: 'Internship posts' },
  { id: 'exa-people', label: 'Find people' },
];

function BoardMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="board-surface flex min-h-dvh items-center justify-center px-5">
      <div className="flyer bg-paper px-8 py-6 text-center text-ink-soft" style={{ '--tilt': '-1deg' } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createClient> | null>(null);
  const [activeDashboard, setActiveDashboard] = React.useState<DashboardTab>('job-post-search');
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [hasRestoredState, setHasRestoredState] = React.useState(false);
  const [isAuthResolved, setIsAuthResolved] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const [isSupabaseUnavailable, setIsSupabaseUnavailable] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      setSupabase(createClient());
    } catch (error) {
      console.warn('Supabase client is unavailable:', error);
      setIsSupabaseUnavailable(true);
      setIsAuthenticated(false);
      setIsAuthResolved(true);
    }
  }, []);

  const displayName = React.useMemo(() => {
    if (!userEmail) return 'Signed in';
    const localPart = userEmail.split('@')[0] ?? '';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized) return userEmail;

    return normalized
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [userEmail]);

  const profileInitial = React.useMemo(() => {
    const first = displayName.trim().charAt(0);
    return (first || 'U').toUpperCase();
  }, [displayName]);

  React.useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsAuthResolved(true);
        }
        // Avoid racing a sign-in redirect when the user intentionally leaves /dashboard.
        if (!cancelled && pathname?.startsWith('/dashboard')) {
          router.replace('/sign-in?next=/dashboard');
        }
        return;
      }

      if (!cancelled) {
        setIsAuthenticated(true);
        setUserEmail(user.email ?? null);
      }

      try {
        const savedState = await loadUserPageState<PersistedDashboardState>('dashboard');
        if (!cancelled && savedState) {
          if (
            savedState.activeDashboard === 'exa-people' ||
            savedState.activeDashboard === 'job-post-search'
          ) {
            setActiveDashboard(savedState.activeDashboard);
          }
        }
      } catch (error) {
        console.warn('Failed to restore dashboard state:', error);
      } finally {
        if (!cancelled) {
          setHasRestoredState(true);
          setIsAuthResolved(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, supabase]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preferredTab = params.get('dashboard') || params.get('tab');
    if (preferredTab === 'exa-people' || preferredTab === 'job-post-search') {
      setActiveDashboard(preferredTab);
    }
  }, [pathname]);

  React.useEffect(() => {
    if (!hasRestoredState) return;

    const timeoutId = setTimeout(() => {
      void saveUserPageState<PersistedDashboardState>('dashboard', {
        activeDashboard,
      }).catch((error) => {
        console.warn('Failed to persist dashboard state:', error);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeDashboard, hasRestoredState]);

  React.useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const handleSignOut = React.useCallback(async () => {
    if (!supabase) {
      setSignOutError('Sign-in is not set up on this server.');
      return;
    }

    setIsProfileMenuOpen(false);
    setSignOutError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out failed:', error);
        setSignOutError("Couldn't sign you out. Try again.");
        return;
      }

      router.replace('/sign-in');
      router.refresh();
    } catch (error) {
      console.error('Sign out failed:', error);
      setSignOutError("Couldn't sign you out. Try again.");
    }
  }, [router, supabase]);

  if (isSupabaseUnavailable) {
    return <BoardMessage>Sign-in isn&apos;t set up on this server yet, so the app can&apos;t open.</BoardMessage>;
  }

  if (!supabase || !isAuthResolved || !isAuthenticated) {
    return <BoardMessage>Checking you&apos;re signed in...</BoardMessage>;
  }

  return (
    <div className="board-surface min-h-dvh">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-4 px-5 pt-5 sm:px-8">
        <Link
          href="/"
          aria-label="HustlerX home"
          className="flyer bg-paper px-3.5 py-1 font-display text-xl font-extrabold tracking-[-0.03em] text-ink"
          style={{ '--tilt': '-2deg' } as React.CSSProperties}
        >
          HustlerX
        </Link>

        <nav aria-label="Sections" className="order-3 flex w-full gap-2 sm:order-none sm:w-auto">
          {TABS.map((tab) => {
            const active = activeDashboard === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveDashboard(tab.id)}
                className={`min-h-11 flex-1 rounded-[3px] px-4 font-display text-[0.95rem] font-bold tracking-[-0.01em] transition-colors sm:flex-none ${
                  active ? 'bg-paper-yellow text-ink' : 'text-board-muted hover:bg-board-ink/10 hover:text-board-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="relative ml-auto" ref={profileMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-board-ink hover:bg-board-ink/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper font-display text-sm font-bold text-ink">
              {profileInitial}
            </span>
            <span className="hidden max-w-[12rem] truncate text-sm font-semibold sm:block">{displayName}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {isProfileMenuOpen ? (
            <div
              role="menu"
              className="flyer absolute right-0 top-14 z-30 w-64 bg-paper p-2"
              style={{ '--tilt': '1deg' } as React.CSSProperties}
            >
              <p className="truncate px-3 py-2 text-sm text-ink-soft">{userEmail || 'Signed in'}</p>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 rounded-[2px] px-3 py-2.5 text-left font-semibold text-ink hover:bg-paper-sky"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}

          {signOutError ? (
            <p role="alert" className="absolute right-0 top-14 w-64 rounded-[3px] bg-alert-paper px-3 py-2 text-sm text-alert">
              {signOutError}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
        <section hidden={activeDashboard !== 'job-post-search'}>
          <JobPostSearchPage />
        </section>
        <section hidden={activeDashboard !== 'exa-people'}>
          <ExaPeopleDashboard />
        </section>
      </main>
    </div>
  );
}
