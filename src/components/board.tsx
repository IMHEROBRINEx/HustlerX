import * as React from 'react';
import Link from 'next/link';

type Paper = 'white' | 'yellow' | 'pink' | 'mint' | 'sky' | 'grey';
type PinColor = 'red' | 'yellow' | 'green' | 'orange';

const PAPER: Record<Paper, string> = {
  white: 'bg-paper',
  yellow: 'bg-paper-yellow',
  pink: 'bg-paper-pink',
  mint: 'bg-paper-mint',
  sky: 'bg-paper-sky',
  grey: 'bg-paper-grey',
};

const PIN: Record<PinColor, string> = {
  red: '#e23b2e',
  yellow: '#ffcf1f',
  green: '#18a058',
  orange: '#ff7a1a',
};

export function Pin({ color = 'red', className = '' }: { color?: PinColor; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className={`pointer-events-none absolute left-1/2 top-0 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 ${className}`}
    >
      <ellipse cx="15.5" cy="17" rx="8" ry="6" fill="rgb(8 16 58 / 0.28)" />
      <circle cx="14" cy="13" r="9" fill={PIN[color]} stroke="rgb(0 0 0 / 0.22)" strokeWidth="1.2" />
      <path d="M14 22a9 9 0 0 0 9-9 9 9 0 0 1-15.4 6.3A9 9 0 0 0 14 22Z" fill="rgb(0 0 0 / 0.16)" />
      <circle cx="11" cy="9.8" r="2.6" fill="rgb(255 255 255 / 0.55)" />
    </svg>
  );
}

type FlyerProps = {
  as?: React.ElementType;
  paper?: Paper;
  pin?: PinColor | null;
  tilt?: number;
  lift?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>;

export function Flyer({
  as: Tag = 'div',
  paper = 'white',
  pin = 'red',
  tilt = 0,
  lift = true,
  className = '',
  style,
  children,
  ...rest
}: FlyerProps) {
  return (
    <Tag
      className={`flyer ${lift ? 'flyer-lift' : ''} ${PAPER[paper]} ${className}`}
      style={{ '--tilt': `${tilt}deg`, ...style } as React.CSSProperties}
      {...rest}
    >
      {pin ? <Pin color={pin} /> : null}
      {children}
    </Tag>
  );
}

export function Tape({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`tape absolute block h-6 w-24 ${className}`} />;
}

export function PinTag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block font-hand text-[0.95rem] leading-tight text-ink-soft ${className}`}>{children}</span>
  );
}

export function DegreeStamp({ degree }: { degree: 1 | 2 }) {
  return (
    <span className="inline-flex items-center rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink">
      {degree === 1 ? '1st degree' : '2nd degree'}
    </span>
  );
}

export function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border-[1.5px] border-ink/40 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink-soft">
      {children}
    </span>
  );
}

export function TearLink({
  href,
  label,
  tabs = 6,
  className = '',
}: {
  href: string;
  label: string;
  tabs?: number;
  className?: string;
}) {
  return (
    <Link href={href} className={`tear-link group block focus-visible:outline-offset-0 ${className}`}>
      <span className="tear-row">
        {Array.from({ length: tabs }).map((_, index) => (
          <span
            key={index}
            aria-hidden={index > 0 ? 'true' : undefined}
            className={`tear-tab font-display text-sm font-bold tracking-[-0.01em] ${
              index === 0 ? 'bg-paper-yellow text-ink' : 'text-ink-soft'
            }`}
          >
            {label}
          </span>
        ))}
      </span>
    </Link>
  );
}

export function BoardButton({
  href,
  children,
  variant = 'ink',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'ink' | 'yellow' | 'outline';
  className?: string;
}) {
  const styles =
    variant === 'ink'
      ? 'bg-ink text-paper hover:-translate-y-0.5'
      : variant === 'yellow'
        ? 'bg-paper-yellow text-ink hover:-translate-y-0.5'
        : 'bg-transparent text-board-ink ring-2 ring-inset ring-board-ink/70 hover:bg-board-ink/10';
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] px-5 font-display text-[0.95rem] font-bold tracking-[-0.01em] transition-transform duration-300 ease-out ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}
