import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Why Us | Truss",
};

export default function WhyUs() {
  return (
    <>
      <Navbar />
      {/* Hero Section */}
      <section className="relative flex items-center justify-center overflow-hidden min-h-[100vh] pt-28">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Background"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida/ADBb0ugCoG-T5D0XPSU4ZQ2xqAWIX0RaMQXLNXMCQFo9FGNxQhUufbN7cPYsE3SQaD4wBWHHmm2yAv-x_c6eXlylOvvXGLzH_8IMpeYM9arguTtct2Z04XijZKhYfyBDmWE3fhfGlz2oq8nMx_fX-gHAXMu-zdR8Y1NGU_1I_Ul2vdYcB_f9zkAjVPubNpjRYuQI8cZz7USumpZeGZKhMJ5HKZ9ibbhydX94BRjzaKKlfwcvnPgO_1yEXUm2kUERyd0tUvsRQfTDqrTjT4Y"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#131313]/40 to-background"></div>
        </div>
        {/* Content Layer */}
        <div className="relative z-10 w-full max-w-5xl px-6 text-center">
          <div className="flex flex-col items-center">
            {/* Section Label */}
            <div className="inline-block px-4 py-1.5 bg-ember/10 border border-ember/20 rounded-full text-[10px] uppercase tracking-[0.2em] text-ember font-bold mb-8">
              Why Choose Truss
            </div>
            {/* Headline */}
            <h1 className="text-ember tracking-tighter leading-[0.95] text-[42px] md:text-[64px] lg:text-[76px] epilogue-bold uppercase hero-glow">
              We Don&apos;t Give You More Connections
            </h1>
            {/* Sub-headline */}
            <div className="newsreader-italic text-parchment text-[60px] md:text-[100px] lg:text-[120px] leading-[0.8] mt-2 font-medium">
              We Give You The Right Ones
            </div>
            {/* Subtext */}
            <p className="mt-10 text-parchment/80 text-[18px] font-medium max-w-xl">
              The AI platform that transforms your network into meaningful opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <main className="relative z-20 px-8 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-hearth-ash/60 backdrop-blur-2xl rounded-lg p-10 border border-ember/10 shadow-2xl">
            <span className="material-symbols-outlined text-ember text-5xl mb-6 opacity-80">hub</span>
            <h3 className="text-2xl font-bold text-parchment mb-4 tracking-tight">Smart Matching</h3>
            <p className="text-parchment/60 text-sm leading-relaxed">
              Our AI analyzes your network to find the connections that actually matter. No more noise, just signal.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-hearth-ash/60 backdrop-blur-2xl rounded-lg p-10 border border-ember/10 shadow-2xl">
            <span className="material-symbols-outlined text-ember text-5xl mb-6 opacity-80">psychology</span>
            <h3 className="text-2xl font-bold text-parchment mb-4 tracking-tight">Deep Analysis</h3>
            <p className="text-parchment/60 text-sm leading-relaxed">
              We go beyond surface-level metrics to understand the real potential in every relationship.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-hearth-ash/60 backdrop-blur-2xl rounded-lg p-10 border border-ember/10 shadow-2xl">
            <span className="material-symbols-outlined text-ember text-5xl mb-6 opacity-80">trending_up</span>
            <h3 className="text-2xl font-bold text-parchment mb-4 tracking-tight">Measurable Results</h3>
            <p className="text-parchment/60 text-sm leading-relaxed">
              Track your network growth and see concrete outcomes from every connection you make.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-ember epilogue-bold">150+</div>
            <p className="text-parchment/60 mt-2">Meaningful Connections</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-ember epilogue-bold">10x</div>
            <p className="text-parchment/60 mt-2">Network Efficiency</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-ember epilogue-bold">85%</div>
            <p className="text-parchment/60 mt-2">Conversion Rate</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-semibold text-parchment mb-8">Ready to Transform Your Network?</h2>
          <button className="bg-ember text-obsidian px-12 py-5 rounded-lg text-[18px] font-bold flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,182,146,0.2)] hover:scale-95 transition-transform mx-auto">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            See Our Demo
          </button>
        </div>
      </main>

      <Footer />
    </>
  );
}
