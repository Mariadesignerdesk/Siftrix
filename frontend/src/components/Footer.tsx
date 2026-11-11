export default function Footer() {
  return (
    <footer role="contentinfo" className="bg-siftrix-navy border-t border-siftrix-royal/70 shadow-[0_-6px_26px_rgba(139,109,255,0.08)] text-siftrix-soft px-6 md:px-10 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-siftrix-lavender drop-shadow-[0_0_10px_rgba(139,109,255,0.35)]">
          SIFTRIX
        </h2>

        <p className="text-siftrix-soft text-sm">
          AI-Powered Cybersecurity for Everyone.
        </p>

        <p className="text-siftrix-lavender/80 text-sm">
          © 2026 SIFTRIX. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
