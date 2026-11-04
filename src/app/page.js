import Link from "next/link";
import { ArrowDown, ArrowUpRight, Clock3, Search, UserRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShowQr } from "@/components/ui/show-qr";
import { BoardButton, Flyer, PinTag, Stamp, Tape, TearLink } from "@/components/board";

const SEARCH_HREF = "/sign-in?next=%2Fdashboard";

function ExamplePost({ paper, pin, tilt, title, body, by, when, className = "" }) {
  return (
    <Flyer as="article" paper={paper} pin={pin} tilt={tilt} className={`p-5 pt-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <Stamp>Hiring post</Stamp>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {when}
        </span>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold leading-[1.1] tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
      <PinTag className="mt-3">{by}</PinTag>
    </Flyer>
  );
}

const QUERY_PARTS = [
  { text: "frontend internships", note: "what you want" },
  { text: "in Bengaluru", note: "where" },
  { text: "that mention React", note: "skills it should mention" },
  { text: "posted this week", note: "older posts drop off" },
];

export default function Home() {
  return (
    <div className="board-surface">
      <Navbar />

      <main>
        {/* First viewport: the board */}
        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-14 sm:px-8 xl:min-h-[min(calc(100dvh-84px),860px)] xl:grid-cols-12 xl:items-center xl:gap-8 xl:pt-6">
          <Flyer paper="white" pin="red" tilt={-1.2} lift={false} className="max-w-3xl xl:col-span-6">
            <div className="px-6 pb-8 pt-10 sm:px-10">
              <h1 className="font-display text-[clamp(2.7rem,6.2vw,5.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
                Internships with <span className="marker">someone to ask.</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-8 text-ink-soft">
                Truss searches LinkedIn for this week&apos;s internship and job posts, written by the people doing the hiring.
                Newest first, each with a person you can message, plus the official listings alongside.
              </p>
              <Link
                href="#how-it-works"
                className="mt-6 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink underline"
              >
                See how it works
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <TearLink href={SEARCH_HREF} label="Start searching" tabs={7} />
          </Flyer>

          <div className="relative xl:col-span-6 xl:h-[660px]" aria-label="Example posts">
            <p className="mb-8 font-hand text-xl text-board-ink xl:absolute xl:-top-9 xl:left-2 xl:mb-0 xl:-rotate-2">
              Example posts, the kind Truss finds
            </p>
            <div className="grid gap-10 sm:grid-cols-2 xl:block">
              <ExamplePost
                className="xl:absolute xl:left-0 xl:top-12 xl:w-[290px]"
                paper="yellow"
                pin="green"
                tilt={-3}
                when="3 hr ago"
                title="Frontend Intern, 6 months, Bengaluru"
                body="Our design-systems team is taking 2 interns. React + TypeScript. Paid. Comment or DM me."
                by="Posted by Ananya, design lead"
              />
              <ExamplePost
                className="xl:absolute xl:right-0 xl:top-0 xl:w-[280px]"
                paper="white"
                pin="orange"
                tilt={2.5}
                when="Yesterday"
                title="Summer Analyst Internship, Mumbai"
                body="Taking summer interns from any college. Excel and basic SQL. Applications close Friday."
                by="Posted by Rohan, analytics manager"
              />
              <ExamplePost
                className="xl:absolute xl:bottom-0 xl:left-10 xl:w-[300px]"
                paper="pink"
                pin="yellow"
                tilt={1.5}
                when="2 days ago"
                title="Product Design Intern, remote"
                body="Looking for a student who has shipped anything, even a college fest site. Send your portfolio."
                by="Posted by a startup founder"
              />
              <Flyer
                paper="mint"
                pin={null}
                tilt={-4}
                className="p-5 xl:absolute xl:bottom-10 xl:right-0 xl:w-[210px]"
              >
                <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-[-6deg]" />
                <p className="font-hand text-lg leading-snug text-ink">
                  Only posts from the last 7 days. Pick &ldquo;24 hours&rdquo; when you want just the newest.
                </p>
              </Flyer>
            </div>
          </div>
        </section>

        {/* How it works: one annotated query */}
        <section id="how-it-works" className="scroll-mt-8 bg-board-deep">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
            <h2 className="max-w-3xl font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.03em] text-board-ink">
              Type it the way you&apos;d text a friend.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-board-muted">
              No filters to fiddle with. Truss reads your sentence, picks out what matters, and turns any time you mention
              into a hard rule.
            </p>

            <Flyer paper="white" pin="red" tilt={-0.6} lift={false} className="mt-14 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-center gap-3 border-b-2 border-ink pb-4">
                <Search className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                <p className="font-display text-[clamp(1.25rem,2.6vw,2rem)] font-bold leading-snug tracking-[-0.02em]">
                  {QUERY_PARTS.map((part, index) => (
                    <span key={part.text}>
                      <span className="marker">{part.text}</span>
                      {index < QUERY_PARTS.length - 1 ? " " : ""}
                    </span>
                  ))}
                </p>
              </div>
              <ol className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {QUERY_PARTS.map((part) => (
                  <li key={part.note} className="text-sm leading-6 text-ink-soft">
                    <span className="block font-semibold text-ink">&ldquo;{part.text}&rdquo;</span>
                    <PinTag className="text-base">{part.note}</PinTag>
                  </li>
                ))}
              </ol>
            </Flyer>

            <ol className="mt-16 grid gap-10 md:grid-cols-3">
              {[
                ["Search in plain words", "Role, city, skills, company type, how recent. Write it however you'd say it."],
                [
                  "Truss keeps only fresh posts",
                  "Hiring posts and job listings from the last 7 days by default, newest first. Switch to 24 hours, 3 days, or 30 days.",
                ],
                [
                  "You reach out yourself",
                  "Open the post on LinkedIn, comment, or message the person who shared it. Truss never posts or messages for you.",
                ],
              ].map(([title, body], index) => (
                <li key={title} className="border-t-2 border-board-line pt-5">
                  <span className="font-display text-sm font-bold text-paper-yellow">Step {index + 1}</span>
                  <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-board-ink">{title}</h3>
                  <p className="mt-2 max-w-sm leading-7 text-board-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Job board vs your board */}
        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <h2 className="max-w-3xl font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.03em] text-board-ink">
            A job board gives you a listing. Truss gives you a person.
          </h2>
          <div className="mt-16 grid items-start gap-12 md:grid-cols-2 md:gap-16">
            <Flyer paper="grey" pin={null} tilt={1.2} lift={false} className="p-7">
              <Tape className="-top-3 left-8 rotate-[-4deg]" />
              <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-soft">Software Intern</h3>
              <dl className="mt-4 space-y-2 text-sm text-ink-soft">
                <div className="flex gap-2"><dt className="font-semibold">Company:</dt><dd>Confidential</dd></div>
                <div className="flex gap-2"><dt className="font-semibold">Posted:</dt><dd>Some time ago</dd></div>
                <div className="flex gap-2"><dt className="font-semibold">Apply:</dt><dd>Through the portal</dd></div>
                <div className="flex gap-2"><dt className="font-semibold">Someone to ask:</dt><dd>Nobody</dd></div>
              </dl>
              <PinTag className="mt-4">A typical job-board listing</PinTag>
            </Flyer>
            <Flyer paper="yellow" pin="green" tilt={-1.5} className="p-7 md:mt-10">
              <div className="flex items-center justify-between gap-3">
                <Stamp>Hiring post</Stamp>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />3 hr ago
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-[-0.02em]">Frontend Intern</h3>
              <dl className="mt-4 space-y-2 text-sm text-ink-soft">
                <div className="flex gap-2"><dt className="font-semibold text-ink">Posted by:</dt><dd>Ananya, design lead</dd></div>
                <div className="flex gap-2"><dt className="font-semibold text-ink">Posted:</dt><dd>This morning</dd></div>
                <div className="flex gap-2"><dt className="font-semibold text-ink">Next step:</dt><dd>Comment on her post or DM her</dd></div>
                <div className="flex gap-2"><dt className="font-semibold text-ink">Someone to ask:</dt><dd>Ananya</dd></div>
              </dl>
              <PinTag className="mt-4">Example post</PinTag>
            </Flyer>
          </div>
        </section>

        {/* Find people */}
        <section className="bg-paper text-ink dark:bg-board-deep dark:text-board-ink">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h2 className="font-display text-[clamp(2.1rem,4.4vw,3.4rem)] font-extrabold leading-[1] tracking-[-0.03em]">
                Need someone to ask first? Find them.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-ink-soft dark:text-board-muted">
                Search for people in plain words too: alumni at a company you like, recruiters in your city, engineers on a
                team you want to join. Then open their profile and say hello.
              </p>
              <BoardButton href={SEARCH_HREF} className="mt-8 dark:bg-paper dark:text-ink">
                Find people
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </BoardButton>
            </div>
            <div className="lg:col-span-7">
              <Flyer paper="sky" pin="red" tilt={0.8} lift={false} className="p-6 sm:p-8">
                <p className="flex items-center gap-2 border-b-2 border-ink pb-3 font-display text-lg font-bold tracking-[-0.01em]">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Alumni from my college working in product at fintech startups
                </p>
                <ul className="mt-5 divide-y divide-ink/15">
                  {[
                    ["MK", "Meera K.", "Product Manager at a payments startup", "Same college, 2021 batch"],
                    ["AS", "Arjun S.", "Associate PM at a lending app", "Same college, 2022 batch"],
                    ["NR", "Nikhil R.", "Product Analyst at a neobank", "Same college, 2020 batch"],
                  ].map(([initials, name, role, note]) => (
                    <li key={name} className="flex items-center gap-4 py-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-paper">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{name}</span>
                        <span className="block text-sm text-ink-soft">{role}</span>
                      </span>
                      <span className="hidden sm:block">
                        <PinTag>{note}</PinTag>
                      </span>
                    </li>
                  ))}
                </ul>
                <PinTag className="mt-2">Example results</PinTag>
              </Flyer>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="mx-auto grid max-w-7xl gap-14 px-5 py-28 sm:px-8 lg:grid-cols-12 lg:items-center">
          <Flyer paper="yellow" pin="red" tilt={-1} lift={false} className="lg:col-span-7">
            <div className="px-6 pb-8 pt-10 sm:px-10">
              <h2 className="font-display text-[clamp(2.2rem,5vw,4.2rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
                Your next internship is probably already on someone&apos;s feed.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-ink-soft">
                Sign in with Google or email and run your first search.
              </p>
            </div>
            <TearLink href={SEARCH_HREF} label="Sign in to search" tabs={6} />
          </Flyer>
          <div className="flex flex-col items-center gap-4 lg:col-span-5">
            <Flyer paper="white" pin="green" tilt={2} lift={false} className="w-full max-w-xs p-6 text-center">
              <p className="font-hand text-xl text-ink">On your phone between classes?</p>
              <div className="mt-4">
                <ShowQr value="https://truss-ten.vercel.app/" buttonLabel="Show QR code" />
              </div>
            </Flyer>
            <Link
              href="/why-us"
              className="inline-flex items-center gap-1 text-[0.95rem] font-semibold text-board-ink underline"
            >
              Why Truss works for students
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
