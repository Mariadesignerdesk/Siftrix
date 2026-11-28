import { useEffect, useRef, useState } from 'react'
import lightShieldImg from '../assets/hero-shield-masterpiece.webp'
import darkShieldImg from '../assets/hero-shield-dark.webp'

interface GoldenParticle {
  x: number
  y: number
  radius: number
  speedY: number
  speedX: number
  alpha: number
  baseAlpha: number
  phase: number
  twinkleSpeed: number
  color: string
}

/**
 * Premium 3D Metallic Champagne-Gold Shield Hero Component.
 * Faithfully matches the SIFTRIX master reference image with:
 * 1. Realistic 3D metallic champagne-gold shield with nested crystal glass layers.
 * 2. Large central glowing golden padlock with pulsing keyhole flare.
 * 3. Elliptical 3D rotating orbital rings with radar tick marks and satellites.
 * 4. Ambient drifting golden particles & sparkle dust (Canvas 2D).
 * 5. Moving diagonal specular reflection sheen traversing metallic bevels.
 * 6. Floating glassmorphism security cards (Phishing Blocked, Scan Status, Safe Link Verified).
 */
export default function HeroShield3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reduced motion check
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) return

    let animationFrameId: number
    let isVisible = true

    // Generate ambient golden sparkle particles
    const PARTICLE_COUNT = 45
    const particles: GoldenParticle[] = []
    const colors = ['#F5E5BD', '#D8B56D', '#FAF7F0', '#E5C378', '#FFFFFF']

    const initParticle = (p?: Partial<GoldenParticle>): GoldenParticle => ({
      x: p?.x ?? Math.random() * canvas.width,
      y: p?.y ?? Math.random() * canvas.height,
      radius: p?.radius ?? 0.8 + Math.random() * 1.6,
      speedY: 0.15 + Math.random() * 0.35,
      speedX: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.8 + 0.2,
      baseAlpha: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
    })

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (particles.length === 0) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles.push(initParticle())
        }
      }
    }

    handleResize()
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        isVisible = entry.isIntersecting
        if (isVisible && !animationFrameId) {
          animationFrameId = requestAnimationFrame(render)
        }
      },
      { threshold: 0.1 }
    )
    intersectionObserver.observe(container)

    const render = () => {
      if (!isVisible) return

      const w = container.clientWidth
      const h = container.clientHeight
      ctx.clearRect(0, 0, w, h)

      // Center horizontal coordinate of the shield
      const cx = w * 0.51

      // Draw each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y -= p.speedY
        p.x += Math.sin(p.phase) * p.speedX
        p.phase += p.twinkleSpeed

        // Soft twinkle alpha
        p.alpha = p.baseAlpha * (0.6 + Math.sin(p.phase * 2) * 0.4)

        // Reset if drifted beyond canvas bounds
        if (p.y < -10) {
          p.y = h + 10
          p.x = cx + (Math.random() - 0.5) * (w * 0.8)
        }
        if (p.x < -10 || p.x > w + 10) {
          p.x = cx + (Math.random() - 0.5) * (w * 0.8)
        }

        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()

        // Occasional radiant glint
        if (p.radius > 1.8 && p.alpha > 0.6) {
          ctx.globalAlpha = p.alpha * 0.35
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[28rem] sm:max-w-[34rem] lg:max-w-[42rem] xl:max-w-[46rem] aspect-square flex items-center justify-center select-none"
      role="img"
      aria-label="Security shield illustration"
    >
      <style>{`
        @keyframes heroLevitate {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(0.4deg);
          }
        }

        @keyframes orbitRotateSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes orbitRotateReverse {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes keyholeGlowPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(0.92);
            opacity: 0.65;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.22);
            opacity: 1;
          }
        }

        @keyframes metallicSheenSweep {
          0% {
            transform: translateX(-160%) translateY(-160%) rotate(25deg);
            opacity: 0;
          }
          18% {
            opacity: 0.6;
          }
          36% {
            transform: translateX(160%) translateY(160%) rotate(25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(160%) translateY(160%) rotate(25deg);
            opacity: 0;
          }
        }

        @keyframes cardBob1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes cardBob2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(7px); }
        }
        @keyframes cardBob3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes cardBob4 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(6px); }
        }

        .animate-hero-levitate {
          animation: heroLevitate 6.5s ease-in-out infinite;
        }
        .animate-orbit-slow {
          animation: orbitRotateSlow 42s linear infinite;
        }
        .animate-orbit-reverse {
          animation: orbitRotateReverse 32s linear infinite;
        }
        .animate-keyhole-pulse {
          animation: keyholeGlowPulse 3.4s ease-in-out infinite;
        }
        .animate-sheen-sweep {
          animation: metallicSheenSweep 6.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-card-1 {
          animation: cardBob1 4.4s ease-in-out infinite;
        }
        .animate-card-2 {
          animation: cardBob2 5.0s ease-in-out infinite;
        }
        .animate-card-3 {
          animation: cardBob3 4.8s ease-in-out infinite;
        }
        .animate-card-4 {
          animation: cardBob4 5.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-hero-levitate,
          .animate-orbit-slow,
          .animate-orbit-reverse,
          .animate-keyhole-pulse,
          .animate-sheen-sweep,
          .animate-card-1,
          .animate-card-2,
          .animate-card-3,
          .animate-card-4 {
            animation: none !important;
          }
        }
      `}</style>

      {/* 2. Floating Levitation Wrapper */}
      <div className="relative w-full h-full flex items-center justify-center animate-hero-levitate">
        {/* 3. Dynamic Rotating Orbital Rings (SVG Overlay) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {/* Outer Radar Orbit Ring */}
          <svg
            className="w-[92%] h-[92%] animate-orbit-slow"
            viewBox="0 0 400 400"
            fill="none"
          >
            {/* Outer radar dashed circle */}
            <circle
              cx="200"
              cy="200"
              r="185"
              stroke="#D8B56D"
              strokeWidth="0.85"
              strokeDasharray="4 8"
              opacity="0.32"
            />
            {/* Secondary concentric dashed arc */}
            <circle
              cx="200"
              cy="200"
              r="168"
              stroke="#F5E5BD"
              strokeWidth="0.65"
              strokeDasharray="12 24"
              opacity="0.25"
            />
            {/* Radar tick marks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
              (deg) => (
                <line
                  key={deg}
                  x1="200"
                  y1="10"
                  x2="200"
                  y2="18"
                  stroke="#C5A15D"
                  strokeWidth="1.2"
                  opacity="0.38"
                  transform={`rotate(${deg} 200 200)`}
                />
              )
            )}
            {/* Orbiting Satellite Spark 1 */}
            <circle cx="200" cy="15" r="2.5" fill="#FAF7F0" opacity="0.85" />
            <circle cx="200" cy="15" r="5" fill="#D8B56D" opacity="0.3" />
          </svg>

          {/* Inner Counter-Rotating Golden Ring */}
          <svg
            className="absolute w-[82%] h-[82%] animate-orbit-reverse"
            viewBox="0 0 360 360"
            fill="none"
          >
            <circle
              cx="180"
              cy="180"
              r="150"
              stroke="#EBD49E"
              strokeWidth="0.75"
              strokeDasharray="3 14"
              opacity="0.28"
            />
            <circle cx="180" cy="30" r="2" fill="#FFFFFF" opacity="0.9" />
            <circle cx="330" cy="180" r="1.8" fill="#F5E5BD" opacity="0.7" />
          </svg>
        </div>

        {/* 4. High-Resolution 3D Metallic Shield & Glass Layers Image */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {/* Light Mode: Realistic Champagne-Gold 3D Shield */}
          <img
            src={lightShieldImg}
            alt="SIFTRIX 3D Metallic Champagne-Gold Security Shield"
            className="w-full h-full object-contain pointer-events-none select-none block dark:hidden"
            loading="eager"
            decoding="sync"
          />

          {/* Dark Mode: Smoky Obsidian & Champagne-Gold 3D Shield (First Reference Image) */}
          <img
            src={darkShieldImg}
            alt="SIFTRIX 3D Obsidian & Metallic Gold Security Shield"
            className="w-full h-full object-contain pointer-events-none select-none hidden dark:block"
            loading="eager"
            decoding="sync"
          />

          {/* 5. Smooth Moving Specular Light Sheen Overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 animate-sheen-sweep overflow-hidden rounded-full"
            style={{
              background:
                'linear-gradient(115deg, transparent 40%, rgba(216, 181, 109, 0.20) 48%, rgba(250, 246, 239, 0.45) 50%, transparent 60%)',
            }}
          />
        </div>

        {/* 6. Central Padlock Radiant Breathing Flare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 animate-keyhole-pulse"
          style={{
            left: '49.7%',
            top: '48.6%',
            width: '12%',
            height: '12%',
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 225, 135, 0.85) 24%, rgba(216, 181, 109, 0.35) 54%, transparent 75%)',
            filter: 'blur(2px)',
          }}
        />

        {/* 7. Canvas 2D Ambient Golden Sparkle Dust */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-20 w-full h-full"
        />

        {/* 8. Interactive Glassmorphism Information Card Overlays */}
        {/* Card 1: Phishing Blocked (Top Left) */}
        <div
          className="absolute z-30 animate-card-1 cursor-pointer transition-transform duration-300 hover:scale-105"
          style={{ left: '0.8%', top: '25.5%', width: '27%', height: '12.5%' }}
          onMouseEnter={() => setActiveCard('phishing')}
          onMouseLeave={() => setActiveCard(null)}
          tabIndex={0}
          role="button"
          aria-label="Phishing Blocked security card: AI Heuristic Shield Active"
        >
          {activeCard === 'phishing' && (
            <div className="absolute -top-10 left-0 bg-siftrix-charcoal text-siftrix-pearl text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-siftrix-gold/40 whitespace-nowrap animate-siftrix-fade-in pointer-events-none">
              AI Heuristic Shield: Active · 0 Threats Escaped
            </div>
          )}
        </div>

        {/* Card 2: Scan Status (Bottom Left) */}
        <div
          className="absolute z-30 animate-card-2 cursor-pointer transition-transform duration-300 hover:scale-105"
          style={{ left: '4.2%', top: '59.5%', width: '18.5%', height: '18.5%' }}
          onMouseEnter={() => setActiveCard('scan-status')}
          onMouseLeave={() => setActiveCard(null)}
          tabIndex={0}
          role="button"
          aria-label="Scan Status card: 549 scans processed with 99.4% accuracy"
        >
          {activeCard === 'scan-status' && (
            <div className="absolute -top-10 left-0 bg-siftrix-charcoal text-siftrix-pearl text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-siftrix-gold/40 whitespace-nowrap animate-siftrix-fade-in pointer-events-none">
              Telemetry Matrix: 549 Scans · 99.4% Accuracy
            </div>
          )}
        </div>

        {/* Card 3: Scan Analytics (Top Right) */}
        <div
          className="absolute z-30 animate-card-3 cursor-pointer transition-transform duration-300 hover:scale-105"
          style={{ right: '8%', top: '15.5%', width: '17.5%', height: '22%' }}
          onMouseEnter={() => setActiveCard('analytics')}
          onMouseLeave={() => setActiveCard(null)}
          tabIndex={0}
          role="button"
          aria-label="Scan Analytics card: 283 active threat signatures"
        >
          {activeCard === 'analytics' && (
            <div className="absolute -top-10 right-0 bg-siftrix-charcoal text-siftrix-pearl text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-siftrix-gold/40 whitespace-nowrap animate-siftrix-fade-in pointer-events-none">
              Threat Intelligence: 283 Active Scam Models
            </div>
          )}
        </div>

        {/* Card 4: Safe Link Verified (Bottom Right) */}
        <div
          className="absolute z-30 animate-card-4 cursor-pointer transition-transform duration-300 hover:scale-105"
          style={{ right: '12%', bottom: '18.5%', width: '29.5%', height: '15.5%' }}
          onMouseEnter={() => setActiveCard('safe-link')}
          onMouseLeave={() => setActiveCard(null)}
          tabIndex={0}
          role="button"
          aria-label="Safe Link Verified card: SSL and SSRF validated"
        >
          {activeCard === 'safe-link' && (
            <div className="absolute -top-10 right-0 bg-siftrix-charcoal text-siftrix-pearl text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-siftrix-gold/40 whitespace-nowrap animate-siftrix-fade-in pointer-events-none">
              Zero-Trust Verification: SSL & SSRF Safe
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
