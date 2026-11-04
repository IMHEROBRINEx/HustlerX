import { ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Flyer, PinTag, Tape, TearLink } from "@/components/board";

export const metadata = {
  title: "Why Truss | Truss",
};

const REASONS = [
  {
    title: "There's always someone to ask",
    body: "Hiring posts are written by the person doing the hiring. You get a name with every post, so your first message can be a comment or a DM instead of a cold application.",
  },
  {
    title: "Fresh means fresh",
    body: "Results come from the last 7 days by default, newest first. Pick 24 hours when you want only today's posts, or say \u201clast 3 days\u201d in your search. Anything older, or without a date, is left out.",
  },
  {
    title: "You search the way you talk",
    body: "Role, city, skills, internship or full-time, the kind of company. Put it in one sentence. There's no filter panel to learn before your first search.",
  },
  {
    title: "It shows its work",
    body: "Every result shows how long ago it was posted, and posts under two days old are highlighted, so you know what to apply to first.",
  },
];

const QUESTIONS = [
  {
    q: "Do I need a big LinkedIn network?",
    a: "No. Truss searches public LinkedIn hiring posts and job listings, so it works from day one. A bigger network still helps when you reach out, because a shared connection makes your message warmer.",
  },
  {
    q: "Does Truss apply, post, or message for me?",
    a: "No. Truss finds posts and people. You open them on LinkedIn and reach out yourself, in your own words.",
  },
  {
    q: "Is it only for tech internships?",
    a: "No. Search works for any role people post about on LinkedIn: design, finance, marketing, research, operations, and more.",
  },
  {
    q: "How do I sign in?",
    a: "With Google or with an email and password.",
  },
];

export default function WhyUs() {
  return (
    <div className="board-surface">
      <Navbar />

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8">
          <h1 className="max-w-4xl font-display text-[clamp(2.7rem,6.4vw,5.6rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-board-ink">
            Cold-applying is a lottery. A warm lead isn&apos;t.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-board-muted">
            Applying through a portal usually means joining a long queue with no one to ask. Truss starts from the other end:
            posts shared by people you&apos;re already connected to.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <Flyer paper="white" pin="red" tilt={-0.5} lift={false} className="overflow-hidden">
            <div className="relative py-8 pl-14 pr-6 sm:py-12 sm:pl-24 sm:pr-12">
              <span aria-hidden="true" className="absolute inset-y-0 left-8 w-px bg-pin-red/60 sm:left-16" />
              <ol className="space-y-10">
                {REASONS.map((reason, index) => (
                  <li key={reason.title} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-10 top-0.5 font-hand text-2xl font-bold text-pin-red sm:-left-14"
                    >
                      {index + 1}.
                    </span>
                    <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-bold leading-tight tracking-[-0.02em]">
                      {reason.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-[1.05rem] leading-8 text-ink-soft">{reason.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Flyer>
        </section>

        <section className="bg-board-deep">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
            <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1] tracking-[-0.03em] text-board-ink">
              Questions students ask
            </h2>
            <div className="mt-14 grid gap-10 md:grid-cols-2">
              {QUESTIONS.map((item, index) => (
                <Flyer
                  key={item.q}
                  as="details"
                  paper={["yellow", "mint", "sky", "pink"][index % 4]}
                  pin={null}
                  tilt={index % 2 === 0 ? -1 : 1}
                  className="group self-start p-6"
                >
                  <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-[3deg]" />
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-xl font-bold leading-snug tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      className="mt-1 h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 leading-7 text-ink-soft">{item.a}</p>
                </Flyer>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-28 sm:px-8">
          <Flyer paper="yellow" pin="green" tilt={-1} lift={false}>
            <div className="px-6 pb-8 pt-10 sm:px-10">
              <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.8rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
                Find a lead with a name on it.
              </h2>
              <PinTag className="mt-4 text-lg">Sign in with Google or email.</PinTag>
            </div>
            <TearLink href="/sign-in?next=%2Fdashboard" label="Start searching" tabs={6} />
          </Flyer>
        </section>
      </main>

      <Footer />
    </div>
  );
}
