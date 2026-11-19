"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ContinuousTabs } from "@/components/ui/continuous-tabs";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const pathToId = {
    "/": "home",
    "/why-us": "why-us",
    "/about": "about",
    "/sign-in": "sign-in",
  };

  const idToPath = Object.fromEntries(
    Object.entries(pathToId).map(([p, id]) => [id, p])
  );

  const defaultActiveId = pathToId[pathname] ?? "home";

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-hearth-ash/70 backdrop-blur-xl border border-ember/8 rounded-full mx-auto w-11/12 max-w-5xl shadow-2xl">
      <div className="text-xl tracking-tighter text-ember epilogue-bold">
        <Link href="/">HustlerX</Link>
      </div>

      <div className="hidden md:block">
        <ContinuousTabs
          tabs={[
            { id: "home", label: "Home" },
            { id: "why-us", label: "Why us?" },
            { id: "about", label: "About" },
            { id: "sign-in", label: "Sign In" },
          ]}
          defaultActiveId={defaultActiveId}
          onChange={(id) => router.push(idToPath[id] ?? "/")}
        />
      </div>

      <Link
        href="/sign-in?next=%2Fdashboard"
        className="bg-ember text-obsidian px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-95 transition-transform shadow-sm"
      >
        Find Opportunities
        <span className="material-symbols-outlined text-[18px]">north_east</span>
      </Link>
    </header>
  );
}
