"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "@/components/Navbar";
import { Flyer, PinTag, Tape } from "@/components/board";
import { createClient } from "@/lib/supabase";

function getSafeRedirectPath(candidate) {
  if (!candidate) {
    return "/dashboard";
  }

  const trimmed = String(candidate).trim();
  if (!trimmed.startsWith("/")) {
    return "/dashboard";
  }

  if (trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard";
  }

  return trimmed;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  const supabase = useMemo(() => createClient(), []);
  const [isSignInMode, setIsSignInMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignInMode) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setNotice("Account created. Check your inbox for a confirmation link if required.");
    } catch (authError) {
      if (isMountedRef.current) {
        setError(authError instanceof Error ? authError.message : "Authentication failed.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const inputClass =
    "w-full rounded-[3px] border-2 border-ink bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-faint outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--highlight)]";

  return (
    <div className="board-surface min-h-dvh">
      <Navbar />
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-12 lg:pt-20">
        <div className="lg:col-span-5">
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-extrabold leading-[0.97] tracking-[-0.035em] text-board-ink">
            {isSignInMode ? "Welcome back. Your board is waiting." : "Make your board. It's quick."}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-board-muted">
            Sign in to search this week&apos;s internship and job posts on LinkedIn, newest first.
          </p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Flyer paper="white" pin="red" tilt={-0.8} lift={false} className="mx-auto w-full max-w-md">
            <div role="tablist" aria-label="Account" className="flex border-b-2 border-ink">
              {[
                { id: true, label: "Sign in" },
                { id: false, label: "Create account" },
              ].map((tab) => {
                const active = isSignInMode === tab.id;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setIsSignInMode(tab.id);
                      setError("");
                      setNotice("");
                    }}
                    className={`flex-1 px-4 py-4 font-display text-base font-bold tracking-[-0.01em] transition-colors ${
                      active ? "bg-paper-yellow text-ink" : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isSignInMode ? "signin" : "signup"}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 sm:p-8"
              >
                <form onSubmit={handleEmailAuth} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@college.edu"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete={isSignInMode ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      className={inputClass}
                    />
                  </div>

                  {error ? (
                    <p role="alert" className="rounded-[3px] bg-alert-paper px-3 py-2 text-sm font-medium text-alert">
                      {error}
                    </p>
                  ) : null}
                  {notice ? (
                    <p role="status" className="rounded-[3px] bg-paper-mint px-3 py-2 text-sm font-medium text-ink">
                      {notice}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-ink px-4 font-display text-base font-bold text-paper transition-transform duration-300 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {isSubmitting ? "One moment..." : isSignInMode ? "Sign in" : "Create account"}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>
          </Flyer>
          <Flyer
            paper="mint"
            pin={null}
            tilt={3}
            lift={false}
            className="relative mx-auto mt-10 w-full max-w-[16rem] p-4 lg:ml-auto lg:mr-0"
          >
            <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-[-5deg]" />
            <PinTag className="text-lg text-ink">HustlerX never posts or messages anyone for you.</PinTag>
          </Flyer>
        </div>
      </main>
    </div>
  );
}

function SignInFallback() {
  return (
    <div className="board-surface min-h-dvh">
      <Navbar />
      <main className="flex justify-center px-5 pt-24">
        <Flyer paper="white" pin="red" lift={false} className="w-full max-w-md p-8 text-center">
          <p className="text-ink-soft">Loading sign-in...</p>
        </Flyer>
      </main>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}


