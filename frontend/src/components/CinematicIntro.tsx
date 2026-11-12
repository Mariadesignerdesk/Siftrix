import { useCallback, useEffect, useState } from 'react'
import {
  markCinematicIntroSeen,
  shouldShowCinematicIntro,
} from '../utils/introReveal'
import BrandMark from './BrandMark'

interface CinematicIntroProps {
  isHomeRoute: boolean
}

const FADE_START_MS = 1350
const UNMOUNT_AFTER_FADE_MS = 450

/**
 * Brief, skippable opening brand reveal presenting the metallic SIFTRIX shield,
 * a champagne-gold light sweep, and "Intelligence Behind Every Scan."
 * Persists session flag so returning visitors enter without delay.
 */
export default function CinematicIntro({ isHomeRoute }: CinematicIntroProps) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>(() =>
    shouldShowCinematicIntro(isHomeRoute) ? 'visible' : 'done'
  )

  const handleDismiss = useCallback(() => {
    markCinematicIntroSeen()
    setPhase((prev) => (prev === 'done' ? 'done' : 'fading'))
  }, [])

  useEffect(() => {
    if (phase === 'done') {
      return
    }

    if (phase === 'visible') {
      markCinematicIntroSeen()
      const fadeTimer = window.setTimeout(() => {
        setPhase('fading')
      }, FADE_START_MS)

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleDismiss()
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => {
        window.clearTimeout(fadeTimer)
        window.removeEventListener('keydown', onKeyDown)
      }
    }

    const cleanupTimer = window.setTimeout(() => {
      setPhase('done')
    }, UNMOUNT_AFTER_FADE_MS)

    return () => {
      window.clearTimeout(cleanupTimer)
    }
  }, [phase, handleDismiss])

  if (phase === 'done') {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SIFTRIX Brand Reveal"
      className={`fixed inset-0 z-50 overflow-y-auto py-8 flex flex-col items-center justify-center bg-siftrix-charcoal px-6 text-center transition-opacity duration-450 ease-out ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Champagne Radial Stage Illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 52% 42% at 50% 48%, rgba(216, 181, 109, 0.2), rgba(167, 123, 50, 0.06) 46%, transparent 72%)',
        }}
      />

      {/* Architectural Horizon Hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-siftrix-gold/30 to-transparent"
      />

      {/* Diagonal Champagne-Gold Light Sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 overflow-hidden"
      >
        <div className="h-full w-48 bg-gradient-to-r from-transparent via-siftrix-champagne/25 to-transparent blur-xl animate-siftrix-gold-sweep" />
      </div>

      {/* Shield Reveal & Typographic Emblem */}
      <div className="relative z-10 flex flex-col items-center animate-siftrix-intro-emblem">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-full bg-siftrix-champagne/20 blur-2xl animate-siftrix-pulse-slow"
          />
          <BrandMark className="relative h-16 w-16 sm:h-20 sm:w-20 drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]" showFrame={false} />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.26em] text-siftrix-champagne">
          SIFTRIX · Intelligence. Protection. Confidence.
        </p>

        <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-[0.18em] siftrix-gold-text">
          SIFTRIX
        </h1>

        <p className="mt-3 font-editorial italic text-xl sm:text-2xl text-siftrix-pearl tracking-wide">
          Intelligence Behind Every Scan.
        </p>

        <div
          aria-hidden="true"
          className="mt-6 h-[2px] w-28 overflow-hidden rounded-full bg-siftrix-charcoal-border"
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-siftrix-champagne to-transparent animate-siftrix-gold-sweep" />
        </div>
      </div>

      {/* Immediate Skip Control */}
      <button
        type="button"
        onClick={handleDismiss}
        className="siftrix-btn-charcoal-outline relative z-10 mt-10 rounded-full px-5 py-2 text-xs font-semibold tracking-wider uppercase cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
        aria-label="Skip intro reveal and enter SIFTRIX"
      >
        Skip Intro →
      </button>
    </div>
  )
}
