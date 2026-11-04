import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoSection from "@/components/VideoSection";

export const metadata = {
  title: "About Us | Truss",
};

export default function About() {
  return (
    <>
      <Navbar />
      {/* Hero Section */}
      <section className="relative flex items-center justify-center overflow-hidden min-h-[100vh] pt-28">
        <div className="absolute inset-0 z-0">
          <img
            alt="Background"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida/ADBb0ugCoG-T5D0XPSU4ZQ2xqAWIX0RaMQXLNXMCQFo9FGNxQhUufbN7cPYsE3SQaD4wBWHHmm2yAv-x_c6eXlylOvvXGLzH_8IMpeYM9arguTtct2Z04XijZKhYfyBDmWE3fhfGlz2oq8nMx_fX-gHAXMu-zdR8Y1NGU_1I_Ul2vdYcB_f9zkAjVPubNpjRYuQI8cZz7USumpZeGZKhMJ5HKZ9ibbhydX94BRjzaKKlfwcvnPgO_1yEXUm2kUERyd0tUvsRQfTDqrTjT4Y"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#131313]/40 to-background"></div>
        </div>
        <div className="relative z-10 w-full max-w-5xl px-6 text-center">
          <div className="flex flex-col items-center">
            <div className="inline-block px-4 py-1.5 bg-ember/10 border border-ember/20 rounded-full text-[10px] uppercase tracking-[0.2em] text-ember font-bold mb-8">
              The Story
            </div>
            <h1 className="text-ember tracking-tighter leading-[0.95] text-[42px] md:text-[64px] lg:text-[76px] epilogue-bold uppercase hero-glow">
              You&apos;ve Heard Humans Are Social Animals,{" "}
              <span className="newsreader-italic text-parchment text-[60px] md:text-[90px] leading-[0.8]">
                But You&apos;ve Never Asked Why
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* Story Content */}
      <section className="relative px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <p className="newsreader-italic text-xl md:text-2xl text-ember mb-8">
              The Question Nobody Actually Asks
            </p>

            <p>
              Human beings are called social animals so often that the phrase has gone stale. It sits in textbooks and TED
              Talks and nobody bothers to inspect, like &quot;water is wet&quot; or &quot;group projects build character.&quot; We hear it,
              nod wisely, and move on.
            </p>

            <p>But pause for a second.</p>

            <p className="text-ember font-semibold text-2xl">Why are we social animals?</p>

            <p>
              Why did a species that could have evolved sharper claws, thicker skin, or the good sense to hibernate instead
              evolve the overwhelming urge to gather, gossip, cooperate, compare, flirt, imitate, perform, seek approval,
              dread rejection, and absolutely refuse to eat lunch alone if someone from school might see?
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 1 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">Survival Was Just the Opening Act</h2>

            <p>
              The usual answer is survival. Fair enough. In the Stone Age, being alone was not a personality type. It was a
              death wish. If you wandered off from the group, you were not &quot;taking space.&quot; You were volunteering to become
              an anecdote. Groups hunted better, defended better, shared better, learned faster, and kept children alive
              long enough for them to grow up and invent even more complicated social problems.
            </p>

            <p>But survival is only the beginning.</p>

            <p>
              What started as a biological advantage slowly became a mental operating system. Over time, humans did not
              just use social life to avoid catastrophe. We used it to decide who we were. We built meaning through it,
              power through it, culture through it, memory through it, and eventually entire civilizations through it. The
              tools changed. The circles grew. The scale exploded. But the creature at the center of it all remained
              strangely familiar: a primate brain still panicking when left on read.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 2 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">
              Gossip Engines With a Math Co-Processor
            </h2>

            <p>
              Here&apos;s the thing we tend to get backwards. We usually assume we got big brains and then became social. The
              evolutionary psychologist Robin Dunbar argues it was the other way around. His &quot;social brain hypothesis&quot;
              suggests that primate brains grew larger primarily to handle the complexity of social life — tracking
              alliances, reading intentions, remembering who helped you and who stole your food. Our brains are, in a
              meaningful sense, gossip engines with a math co-processor bolted on later. We did not get smart and then
              build societies. We built societies, and the pressure of managing them is what made us smart.
            </p>

            <p>
              Dunbar also argued that language itself probably didn&apos;t evolve so we could coordinate hunts or debate
              metaphysics. It evolved because our groups got too large for physical grooming — the primate version of
              relationship maintenance. When human groups swelled to around 150 people, we would have needed to spend
              nearly half our waking hours grooming each other to keep the peace. That&apos;s not a society; that&apos;s a spa with
              no revenue model. So instead, we invented a cheaper, faster form of grooming: talking. Specifically, talking
              about each other. Gossip was not a side effect of language. It may have been the point of language. Which,
              if you&apos;ve spent five minutes in any workplace, sounds exactly right.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 3 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">The Campfire Was the First Social Network</h2>

            <p>
              In the earliest human communities, the medium of social life was presence. Not content. Not platforms.
              Presence. A face across from your face. A voice in the dark. Shared labor, shared danger, shared meat,
              shared memory. To belong was to be physically woven into the lives of other people.
            </p>

            <p>
              A campfire was not just warmth — it was media. It was where information moved, rules were reinforced,
              alliances were formed, and stories became the first technology for keeping a group emotionally synchronized.
            </p>

            <p>
              And here&apos;s something worth noticing: the campfire didn&apos;t separate &quot;professional&quot; and &quot;personal.&quot; Your hunting
              partner was your friend. Your elder was your mentor and your storyteller and your dispute-resolver. The
              person who taught you to track animals also knew your fears and your family. Competence and character were
              one thing, because you saw both every single day.
            </p>

            <p>
              Every person around that fire was there for a reason. No strangers in the audience. No lurkers. No
              &quot;connections&quot; who had never exchanged a word with you. Every relationship was direct, reciprocal, and
              load-bearing. If someone sat across from you, they mattered. And you mattered to them. That was the deal.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 4 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">When Stories Replaced Faces</h2>

            <p>
              As language grew stronger, humans gained an extraordinary power: the ability to coordinate not only
              actions, but imagination. A group could now share stories about ancestors, spirits, enemies, territories,
              and futures. You no longer had to know every person personally to feel tied to them. You only had to share
              the same story.
            </p>

            <p>
              The political scientist Benedict Anderson called these &quot;imagined communities&quot; — groups bound not by direct
              contact but by shared narrative. Once people could gather around symbols instead of bodies, social life
              stopped being limited to the size of the camp. A tribe could form. A ritual could bind strangers. A myth
              could organize hundreds. We became attached to names, banners, gods, and customs. We invented the first
              large-scale social network — except instead of profile pictures, there were sacred animals and war paint.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 5 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">The Medium Kept Changing — The Need Never Did</h2>

            <p>
              Writing arrived, and society was no longer trapped inside memory. Before writing, if someone important said
              something wise, everyone else had to remember it correctly. Which, if modern family WhatsApp groups are
              any indication, was never a guarantee. Writing let laws outlive lawmakers, religions travel, and messages
              exist without mouths.
            </p>

            <p>
              Trust began shifting from known individuals to shared institutions. You didn&apos;t need to personally know the
              farmer, priest, or ruler. You needed to know the rules. Society became less like a circle around a fire and
              more like an invisible web of obligations.
            </p>

            <p>
              Print thickened the web. Ideas could scale faster than families. Belief could spread farther than bloodlines.
              Nations became imaginable because millions could consume the same language, the same stories, the same
              headlines. We are apes who learned to care deeply about abstractions. A flag can move us. A constitution
              can unite us. A printed idea can make us laugh, fight, march, marry, revolt, and occasionally major in
              philosophy.
            </p>

            <p>
              Then electricity did what electricity does best: it made everything faster and harder to ignore. The
              telegraph shrank distance. Radio gave one voice to millions. Television added spectacle. At each stage,
              social life became less local and more mediated. The village had expanded to continental scale. The
              emotional wiring, however, had not been upgraded. The firmware was still Paleolithic. The apps were not.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 6 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">
              The Age of Infinite Connection and Infinite Noise
            </h2>

            <p>Which brings us, with a mix of awe and mild dread, to now.</p>

            <p>
              If the campfire was the first social medium, the smartphone is its hyperactive, sleep-deprived descendant.
              It is the campfire, the marketplace, the gossip circle, the theatre, the tribal council, the public
              square, and the mirror — all glowing in your palm while you pretend to be &quot;just checking one thing.&quot;
            </p>

            <p>
              But here is what changed, and it changed everything: for the first time in the history of our species, the
              bottleneck on human connection disappeared. You can now reach virtually anyone on earth within seconds.
              You can &quot;connect&quot; with a thousand people before lunch. You can accumulate followers, contacts, mutuals, and
              group memberships at a pace that would have made a medieval king dizzy.
            </p>

            <p className="text-ember italic text-2xl">And yet.</p>

            <p>
              The modern social landscape is not a richer version of the campfire. It is an unfiltered firehose pointed
              at a brain that evolved for a gentle stream. We do not simply communicate; we broadcast, monitor, signal,
              brand, curate, react, and scroll. Most of these connections are not connections at all. They&apos;re impressions
              — fleeting, shallow, non-reciprocal digital encounters that create the sensation of social life without
              actually delivering it. The social equivalent of eating dosa without sambar: technically food, technically
              in your mouth, but nobody is being nourished.
            </p>

            <p>
              This is true personally and professionally. Your LinkedIn is full of people you&apos;d never call. Your phone
              is full of people you never text. Professionally, we collect contacts like trophies we never display —
              five hundred connections who endorsed you for &quot;leadership&quot; but couldn&apos;t describe what you actually do.
              Personally, we maintain friendships we never deepen — birthday wishes sent on autopilot, comment sections
              mistaken for conversations, group chats where everyone performs and nobody connects.
            </p>

            <p>
              Our ancestors worried about whether their tribe accepted us. We worry about that too, except now the tribe
              includes co-workers, family, school friends, mutuals, followers, and a suspiciously quiet group chat with
              eight people and no replies in six hours. And most of these people, if we&apos;re honest, we couldn&apos;t describe
              in two sentences.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 7 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">
              The Loneliest Generation in the Most Connected Era
            </h2>

            <p>
              Robin Dunbar estimated that humans can maintain roughly 150 stable relationships — a number that has held
              up across hunter-gatherer bands, Roman military units, Amish parishes, Christmas card lists, and the number
              of Facebook friends people actually interact with. Even with 1,000 online friends, people only meaningfully
              engage with about 150. We didn&apos;t expand our social circle. We just added a very large audience to it.
            </p>

            <p>
              E.O. Wilson put it sharply: we have Paleolithic emotions, medieval institutions, and godlike technology. The
              same brain that once tracked a handful of allies now tracks follower counts. The same brain that once feared
              exile now interprets silence online as danger. The same reward system that once lit up at a genuine smile now
              lights up at notifications designed by people who understand that our biology is highly clickable.
            </p>

            <p>
              Research compiled by Julianne Holt-Lunstad found that chronic social disconnection carries a mortality risk
              comparable to smoking fifteen cigarettes a day. We think our technology is futuristic, but our behavior is
              ancient. We still crave recognition. We still fear humiliation. We still seek belonging. We still perform
              for the group. Only now the group is larger, faster, less embodied, and occasionally represented by a blue
              tick and twelve anonymous comments from people named things like @the_flame_alchemist_571.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 8 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">
              We Don&apos;t Need More Connections — We Need the Right Ones
            </h2>

            <p>Somewhere in all this noise, something important got buried.</p>

            <p>
              We started confusing network size with social health. A full contact list became proof of a full life. A
              packed calendar became proof of relevance. But deep down, in the part of the brain that hasn&apos;t changed
              since the savannah, we know the difference. We can feel it. The difference between someone who knows your
              name and someone who knows your mind. Between a follower and a friend. Between a contact and a collaborator.
              Between a notification and a conversation.
            </p>

            <p>
              This collapse has hit both sides of our lives. Personally, people started outsourcing intimacy to strangers
              — forming parasocial bonds with podcast hosts, YouTubers, and streamers whose voices they hear more often
              than their own friends&apos;. Not because they&apos;re broken, but because the need is ancient and non-negotiable,
              and when real relationships fail to nourish you, the heart finds substitutes.
            </p>

            <p>
              Professionally, the damage is just as real. We &quot;network&quot; at scale, collecting handshakes and LinkedIn
              requests, while the people who could genuinely change our trajectory — the mentor who would challenge our
              assumptions, the collaborator who complements our blind spots, the co-founder hiding in plain sight — are
              buried under hundreds of weak ties we&apos;ll never activate. The colleague who actually pushes your thinking
              is worth more than an auditorium of polite acquaintances. But finding that person requires something our
              current tools don&apos;t provide: not more reach, but better signal.
            </p>

            <p>
              The campfire worked not because it was sophisticated, but because it was curated by necessity. Every
              person around it was relevant. Every relationship carried weight. There was no noise, because there was no
              room for it. Now our fire has a million people sitting around it and we can barely hear the person next to
              us.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-ember/20 my-16"></div>

          {/* Part 9 */}
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-parchment/80 font-accent">
            <h2 className="text-3xl font-semibold text-parchment mb-8">What We Always Wanted</h2>

            <p>So why are humans social animals?</p>

            <p>
              Because sociality was never just about company. It was our survival strategy, then our learning system,
              then our memory system, then our identity system, then our political system, then our symbolic world, and
              now our digital habitat. We did not merely become social in order to live. We became human through the
              expanding mediums of social life.
            </p>

            <p>
              From fire to folklore, from writing to print, from radio to television, from smartphones to social platforms
              — every age has built new ways to connect. But every new medium has landed in the same old mind. A mind
              that still wants what it always wanted: to be seen, to be valued, to belong, to matter.
            </p>

            <p className="text-ember text-2xl font-semibold">Not to a million people. To the right ones.</p>

            <p>
              The tools have changed every few centuries. The need hasn&apos;t changed in a hundred thousand years. We
              evolved around small fires with a few dozen faces we knew by heart — people who were simultaneously our
              colleagues, our friends, our mentors, and our safety net. Every expansion since has tried to stretch that
              circle wider. Some of that stretching was miraculous. And some of it has stretched us so thin that we&apos;ve
              lost the thing the fire gave us in the first place: the feeling that the people around us are actually
              there.
            </p>

            <p>
              The next chapter of human connection won&apos;t be defined by who can reach the most people. It will be defined
              by who can find the ones worth reaching — personally and professionally. The ones who see us, challenge us,
              hold us accountable, show up when it&apos;s inconvenient, and stay when it&apos;s hard.
            </p>

            <p className="text-2xl md:text-3xl text-ember font-semibold mt-12">
              The future of connection is not more. It's truer.
            </p>

            <p className="text-xl italic text-parchment/60 mt-8">
              And somewhere, the campfire is still burning. The question is whether we can find our way back to it — not
              by abandoning the modern world, but by remembering what the fire was actually for.
            </p>

            <p className="text-xl font-bold text-parchment mt-12">
              It was never about the size of the circle. It was about who was in it.
            </p>

            <p className="text-2xl italic text-parchment/60 mt-8">
              And somewhere, the campfire is still burning. The question is whether we can find our way back to it — not
              by abandoning the modern world, but by remembering what the fire was actually for.
            </p>

            <p className="text-2xl font-bold text-parchment mt-12">
              It was never about the size of the circle. It was about who was in it.
            </p>
          </div>
        </div>
      </section>

      <VideoSection />
      <Footer />
    </>
  );
}
