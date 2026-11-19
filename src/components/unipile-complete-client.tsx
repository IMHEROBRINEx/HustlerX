'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function isSuccessStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'success' || normalized === 'connected' || normalized === 'ok';
}

export function UnipileCompleteClient() {
  const searchParams = useSearchParams();
  const status = (searchParams.get('trussConnectStatus') || searchParams.get('status') || 'unknown').trim();
  const connected = isSuccessStatus(status);

  React.useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: 'truss-connect-linkedin-complete',
          status,
        },
        window.location.origin,
      );

      const timeoutId = window.setTimeout(() => {
        window.close();
      }, 200);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [status]);

  return (
    <main className="board-surface flex min-h-dvh items-center justify-center px-5">
      <div className="flyer w-full max-w-md space-y-3 bg-paper p-8 text-center text-ink" style={{ '--tilt': '-1deg' } as React.CSSProperties}>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {connected ? 'LinkedIn connected' : 'LinkedIn sign-in finished'}
        </h1>
        <p className="text-ink-soft">
          {connected
            ? 'You can head back to HustlerX now.'
            : 'Head back to HustlerX to keep going.'}
        </p>
        <p className="text-sm text-ink-faint">You can close this window.</p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-[3px] bg-ink px-5 font-display font-bold text-paper"
        >
          Back to HustlerX
        </Link>
      </div>
    </main>
  );
}
