export default function Footer() {
  return (
    <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center border-t border-[#594136]/10 bg-[#161311]">
      <div className="flex flex-col items-center md:items-start gap-2">
        <div className="text-lg font-bold text-parchment font-[Epilogue]">HustlerX</div>
        <p className="text-[#eae1dd]/40 font-[Newsreader] italic text-sm">© 2024 HustlerX. Built in the Obsidian depths.</p>
      </div>
      <div className="flex gap-8 my-6 md:my-0">
        <a className="text-[#eae1dd]/40 hover:text-[#ffb866] transition-colors font-[Newsreader] italic text-sm" href="#">
          Privacy
        </a>
        <a className="text-[#eae1dd]/40 hover:text-[#ffb866] transition-colors font-[Newsreader] italic text-sm" href="#">
          Terms
        </a>
        <a className="text-[#eae1dd]/40 hover:text-[#ffb866] transition-colors font-[Newsreader] italic text-sm" href="#">
          Contact
        </a>
      </div>
      <div className="flex items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
        <span className="w-2 h-2 rounded-full bg-ember animate-pulse shadow-[0_0_8px_rgba(255,182,146,0.8)]"></span>
        <span className="text-ember text-[10px] uppercase font-mono tracking-widest">Hearth Active</span>
      </div>
    </footer>
  );
}
