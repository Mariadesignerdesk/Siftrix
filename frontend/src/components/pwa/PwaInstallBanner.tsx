import { useEffect, useState } from 'react'
import BrandMark from '../BrandMark'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if previously dismissed in this session
    if (sessionStorage.getItem('sfx_pwa_banner_dismissed')) {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setIsVisible(false)
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    try {
      sessionStorage.setItem('sfx_pwa_banner_dismissed', 'true')
    } catch {
      // ignore
    }
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div
      role="banner"
      aria-label="Install SIFTRIX Progressive Web App"
      className="sticky top-0 z-40 bg-gradient-to-r from-siftrix-charcoal via-[#2D2C34] to-siftrix-charcoal border-b border-siftrix-gold/50 px-4 py-2.5 text-siftrix-beige shadow-lg animate-siftrix-enter"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark className="h-6 w-6 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-siftrix-champagne">Install SIFTRIX App</span>
            <span className="hidden md:inline text-[#C8C1B6] ml-2">
              — Offline threat scanning, home screen launch & real-time telemetry.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="siftrix-btn-gold px-3.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
          >
            Install SIFTRIX
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="text-xs text-[#A59F94] hover:text-white px-2 py-1 cursor-pointer transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
