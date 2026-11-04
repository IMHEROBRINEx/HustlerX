export default function VideoSection() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
        <source src="/videos/AboveFooter.mp4" type="video/mp4" />
      </video>
    </section>
  );
}
