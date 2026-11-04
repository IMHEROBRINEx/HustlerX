import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-board-deep text-board-muted">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl font-extrabold tracking-[-0.03em] text-board-ink">Truss</p>
          <p className="mt-1 max-w-sm text-sm leading-6">
            Fresh internship and job posts from the people doing the hiring.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <Link className="hover:text-board-ink" href="/">How it works</Link>
          <Link className="hover:text-board-ink" href="/why-us">Why Truss</Link>
          <Link className="hover:text-board-ink" href="/about">About</Link>
          <Link className="hover:text-board-ink" href="/sign-in">Sign in</Link>
        </nav>
        <p className="text-sm">© {currentYear} Truss</p>
      </div>
    </footer>
  );
}
