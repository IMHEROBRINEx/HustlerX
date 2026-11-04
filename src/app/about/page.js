import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Flyer, PinTag, Tape, TearLink } from "@/components/board";

export const metadata = {
  title: "About | Truss",
};

export default function About() {
  return (
    <div className="board-surface">
      <Navbar />

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8">
          <h1 className="max-w-5xl font-display text-[clamp(2.6rem,6vw,5.2rem)] font-extrabold leading-[0.97] tracking-[-0.035em] text-board-ink">
            You&apos;ve heard humans are social animals, but you&apos;ve never asked why.
          </h1>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
          <Flyer paper="white" pin="red" tilt={0.6} lift={false} className="px-6 py-10 sm:px-14 sm:py-14">
            <Tape className="-top-3 right-10 rotate-[8deg]" />
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">The question nobody actually asks</h2>
            <div className="mt-6 space-y-5 text-[1.075rem] leading-8 text-ink-soft">
              <p>
                Human beings are called social animals so often that the phrase has gone stale. It sits in textbooks and TED
                Talks and nobody bothers to inspect, like &quot;water is wet&quot; or &quot;group projects build character.&quot; We hear
                it, nod wisely, and move on.
              </p>
              <p>But pause for a second.</p>
              <p className="font-display text-[1.6rem] font-bold leading-snug tracking-[-0.02em] text-ink">
                <span className="marker">Why are we social animals?</span>
              </p>
              <p>
                Why did a species that could have evolved sharper claws, thicker skin, or the good sense to hibernate instead
                evolve the overwhelming urge to gather, gossip, cooperate, compare, flirt, imitate, perform, seek approval,
                dread rejection, and absolutely refuse to eat lunch alone if someone from school might see?
              </p>
            </div>
            <PinTag className="mt-8 text-lg">
              That&apos;s why Truss starts with people: the fastest way into a first job is usually someone who already knows
              you.
            </PinTag>
          </Flyer>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-28 sm:px-8">
          <Flyer paper="mint" pin="orange" tilt={-1} lift={false}>
            <div className="px-6 pb-8 pt-10 sm:px-10">
              <h2 className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1] tracking-[-0.03em]">
                Put your network to work.
              </h2>
            </div>
            <TearLink href="/sign-in?next=%2Fdashboard" label="Start searching" tabs={6} />
          </Flyer>
        </section>
      </main>

      <Footer />
    </div>
  );
}
