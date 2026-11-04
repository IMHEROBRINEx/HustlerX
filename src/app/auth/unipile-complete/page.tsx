import { Suspense } from 'react';

import { UnipileCompleteClient } from '@/components/unipile-complete-client';

function UnipileCompleteFallback() {
  return (
    <main className="board-surface flex min-h-dvh items-center justify-center px-5">
      <div className="flyer w-full max-w-md bg-paper p-8 text-center text-ink-soft">
        <p>Finishing LinkedIn sign-in...</p>
      </div>
    </main>
  );
}

export default function UnipileCompletePage() {
  return (
    <Suspense fallback={<UnipileCompleteFallback />}>
      <UnipileCompleteClient />
    </Suspense>
  );
}

