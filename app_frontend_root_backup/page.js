import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoSection from "@/components/VideoSection";
import { ShowQr } from "@/components/ui/show-qr";

export default function Home() {
  return (
    <>
      <Navbar />
      {/* Hero Section */}
      <section className="relative flex items-center justify-center overflow-hidden min-h-[100vh] pt-28">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Ancestral hearth scene with people gathered around a campfire in a cave"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida/ADBb0ugCoG-T5D0XPSU4ZQ2xqAWIX0RaMQXLNXMCQFo9FGNxQhUufbN7cPYsE3SQaD4wBWHHmm2yAv-x_c6eXlylOvvXGLzH_8IMpeYM9arguTtct2Z04XijZKhYfyBDmWE3fhfGlz2oq8nMx_fX-gHAXMu-zdR8Y1NGU_1I_Ul2vdYcB_f9zkAjVPubNpjRYuQI8cZz7USumpZeGZKhMJ5HKZ9ibbhydX94BRjzaKKlfwcvnPgO_1yEXUm2kUERyd0tUvsRQfTDqrTjT4Y"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#131313]/40 to-background"></div>
        </div>
        {/* Content Layer */}
        <div className="relative z-10 w-full max-w-5xl px-6 text-center">
          <div className="flex flex-col items-center">
            {/* Headline Line 1 */}
            <h1 className="inline mt-25 py-1.5 text-ember tracking-tighter leading-[0.95] text-[42px] md:text-[64px] lg:text-[76px] epilogue-bold uppercase hero-glow">
              AI that make your connections into
            </h1>
            {/* Headline Line 2 */}
            <div className="newsreader-italic text-parchment text-[60px] md:text-[100px] lg:text-[120px] leading-[0.8] mt-2 font-medium">
              Leads
            </div>
            {/* Subtext */}
            <p className="mt-10 text-parchment/80 text-[18px] font-medium max-w-xl">
              AI SaaS for Social Animals
            </p>
            {/* CTA */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button className="bg-ember text-obsidian px-12 py-5 rounded-lg text-[18px] font-bold flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,182,146,0.2)] hover:scale-95 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
                See Our Demo
              </button>
            </div>
            {/* AI Pulse Signature Component */}
            <div className="mt-20 flex flex-col items-center gap-3">
              <div className="w-16 h-[1px] bg-ember/30 animate-pulse"></div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-ember/50">System Processing</span>
            </div>
          </div>
        </div>
      </section>
      {/* Main Content Canvas */}
      <main className="relative z-20 -mt-20 px-8 pb-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Glass Card 1 */}
          <div className="md:col-span-8 bg-hearth-ash/60 backdrop-blur-2xl rounded-lg p-10 border border-ember/10 flex flex-col justify-between min-h-[420px] shadow-2xl">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 bg-ember/10 border border-ember/20 rounded-full text-[10px] uppercase tracking-[0.2em] text-ember font-bold">
                Intelligence
              </div>
              <h2 className="text-4xl font-semibold text-parchment max-w-md leading-tight">
                Predictive matching that understands the human element.
              </h2>
            </div>
            <div className="mt-10 relative group">
              <div className="absolute inset-0 bg-ember/5 rounded-lg filter blur-2xl group-hover:bg-ember/10 transition-colors"></div>
              <img
                alt="Abstract data visualization"
                className="relative w-full h-56 object-cover rounded-lg opacity-80 grayscale contrast-125 transition-all duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBusKt1aSCPO1m758rMgIZIdi8GJfrgwe5Qi0Uz9dwGAnDs1j5GtdpjelwFkNVRf3-iMTQRecPrkYR2w67sUXF6haq5xANIG7b5JWUCCGDyrrdqdPbJ0M54aDE3WC3YrKnvbPj5gv47igK8UAlc9_1ZIkL_CrwldHPB_TH8tj54z6C0VDBAHhia0ujvsFe503KA4IxZJdQXEG5xfwSt6RC3UnhFmq759wgzj-bFKJAL1qfVLNwyMnCwQOa0lOL2_RTYA46AkFakozsB"
              />
            </div>
          </div>
          {/* Side Card */}
          <div className="md:col-span-4 bg-hearth-ash/80 backdrop-blur-xl border border-ember/5 rounded-lg p-10 flex flex-col justify-center text-center shadow-xl">
            <span className="material-symbols-outlined text-ember text-6xl mb-8 opacity-80">bubble_chart</span>
            <h3 className="text-2xl font-bold text-parchment mb-4 tracking-tight">Neural Networks</h3>
            <p className="text-parchment/60 text-sm leading-relaxed mb-8">
              Our proprietary architecture maps social signals into actionable revenue paths using multi-modal AI agents.
            </p>
            <div className="mt-4">
              <ShowQr value="https://truss.app/download" buttonLabel="Download App" />
            </div>
          </div>
        </div>
      </main>
      <VideoSection />
      <Footer />
    </>
  );
}
