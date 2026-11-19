"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const NAV_ITEMS = [
  { label: "How it works", path: "/" },
  { label: "Why HustlerX", path: "/why-us" },
  { label: "About", path: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="relative z-40 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 pt-5 sm:px-8">
      <Link
        href="/"
        aria-label="HustlerX home"
        className="flyer relative bg-paper px-4 py-1.5 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink"
        style={{ "--tilt": "-2deg" }}
      >
        <span aria-hidden="true" className="tape absolute -top-2.5 left-1/2 block h-4 w-12 -translate-x-1/2 rotate-[4deg]" />
        HustlerX
      </Link>

      <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? "page" : undefined}
              className={`text-[0.95rem] font-semibold transition-colors ${
                active ? "text-board-ink" : "text-board-muted hover:text-board-ink"
              }`}
            >
              <span className={active ? "border-b-[3px] border-paper-yellow pb-0.5" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className={`hidden text-[0.95rem] font-semibold sm:inline ${
            pathname === "/sign-in" ? "text-board-ink" : "text-board-muted hover:text-board-ink"
          }`}
        >
          Sign in
        </Link>
        <Link
          href="/sign-in?next=%2Fdashboard"
          className="hidden min-h-11 items-center rounded-[3px] bg-paper-yellow px-4 font-display text-[0.95rem] font-bold tracking-[-0.01em] text-ink transition-transform duration-300 ease-out hover:-translate-y-0.5 sm:inline-flex"
        >
          Start searching
        </Link>

        <details className="relative md:hidden">
          <summary
            aria-label="Open menu"
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[3px] text-board-ink ring-2 ring-inset ring-board-ink/60 [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-5 w-5" />
          </summary>
          <div
            className="flyer absolute right-0 top-14 w-56 bg-paper p-2"
            style={{ "--tilt": "1deg" }}
          >
            {[...NAV_ITEMS, { label: "Sign in", path: "/sign-in" }].map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block rounded-[2px] px-3 py-2.5 text-[0.95rem] font-semibold text-ink ${
                  pathname === item.path ? "bg-paper-yellow" : "hover:bg-paper-sky"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sign-in?next=%2Fdashboard"
              className="mt-1 block rounded-[2px] bg-ink px-3 py-2.5 text-center font-display font-bold text-paper"
            >
              Start searching
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
