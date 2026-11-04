export default function VideoSection() {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-canvas">
      <video className="w-full h-full object-cover brightness-[0.78] contrast-110 dark:brightness-[0.86]" autoPlay loop muted playsInline>
        <source src="/videos/AboveFooter.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/45" />
    </section>
  );
}
