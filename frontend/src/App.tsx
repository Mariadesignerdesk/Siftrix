import { useCallback, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import ModernVisualShowcase from './components/ModernVisualShowcase'
import HowItWorks from './components/HowItWorks'
import CommandCenterPreview from './components/CommandCenterPreview'
import About from './components/About'
import Footer from './components/Footer'
import CinematicIntro from './components/CinematicIntro'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ScanDetailsPage from './pages/ScanDetailsPage'
import ScanHistoryPage from './pages/ScanHistoryPage'
import ScannerPage from './pages/ScannerPage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import AssistantPage from './pages/AssistantPage'
import LeaderboardPage from './pages/LeaderboardPage'
import RewardsPage from './pages/RewardsPage'
import CyberAssistant from './components/chat/CyberAssistant'
import PwaInstallBanner from './components/pwa/PwaInstallBanner'
import {
  getAuthenticatedSession,
  logoutUser,
  syncCrossTabAuthStorageEvent,
  verifyCurrentSession,
} from './services/authService'
import type { AuthPreviewSession } from './utils/authPreview'
import { useAppRouter } from './utils/router'

function areAuthSessionsEqual(
  a: AuthPreviewSession | null,
  b: AuthPreviewSession | null
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.mode === b.mode &&
    a.createdAt === b.createdAt
  )
}

function App() {
  const { route, navigate } = useAppRouter()
  const [authSession, setAuthSession] = useState<AuthPreviewSession | null>(
    () => getAuthenticatedSession()
  )

  const handleAuthSessionChange = useCallback(
    (nextSession: AuthPreviewSession | null) => {
      setAuthSession((prev) =>
        areAuthSessionsEqual(prev, nextSession) ? prev : nextSession
      )
    },
    []
  )

  const syncAuthSessionFromStorage = useCallback(() => {
    setAuthSession((prev) => {
      const next = getAuthenticatedSession(prev?.mode ?? 'signin')
      return areAuthSessionsEqual(prev, next) ? prev : next
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    async function verifyStartupAuth() {
      await verifyCurrentSession()
      if (!isMounted) {
        return
      }
      syncAuthSessionFromStorage()
    }

    void verifyStartupAuth()

    return () => {
      isMounted = false
    }
  }, [syncAuthSessionFromStorage])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleAuthChange = () => {
      syncAuthSessionFromStorage()
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (!syncCrossTabAuthStorageEvent(event)) {
        return
      }
      syncAuthSessionFromStorage()
    }

    window.addEventListener('siftrix:auth-change', handleAuthChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('siftrix:auth-change', handleAuthChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [syncAuthSessionFromStorage])

  const handleSignOut = () => {
    logoutUser()
    handleAuthSessionChange(null)
  }

  const sessionScopeKey = authSession?.id
    ? `auth:${authSession.id}`
    : authSession?.email
      ? `auth:${authSession.email}`
      : 'guest'

  return (
    <div
      className="relative min-h-screen bg-siftrix-beige text-siftrix-graphite flex flex-col overflow-x-clip"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 42% at 50% 0%, rgba(216, 181, 109, 0.2), transparent 72%)',
      }}
    >
      <CinematicIntro isHomeRoute={route.page === 'home'} />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 siftrix-cyber-grid opacity-65"
        style={{
          maskImage:
            'radial-gradient(ellipse 88% 58% at 50% 14%, black 18%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 88% 58% at 50% 14%, black 18%, transparent 78%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <PwaInstallBanner />
        <Navbar
          currentPage={route.page}
          onNavigate={navigate}
          authSession={authSession}
          onSignOut={handleSignOut}
        />
        <main className="flex-1">
          {route.page === 'scanner' ? (
            <ScannerPage key={sessionScopeKey} onNavigate={navigate} />
          ) : route.page === 'dashboard' ? (
            <DashboardPage key={sessionScopeKey} onNavigate={navigate} />
          ) : route.page === 'history' ? (
            <ScanHistoryPage key={sessionScopeKey} onNavigate={navigate} />
          ) : route.page === 'scan-details' ? (
            <ScanDetailsPage
              key={`${sessionScopeKey}:${route.scanId}`}
              scanId={route.scanId}
              onNavigate={navigate}
            />
          ) : route.page === 'settings' ? (
            <SettingsPage
              onNavigate={navigate}
              authSession={authSession}
              onSignOut={handleSignOut}
            />
          ) : route.page === 'login' ? (
            <LoginPage
              authSession={authSession}
              onAuthChange={handleAuthSessionChange}
              onNavigate={navigate}
            />
          ) : route.page === 'signup' ? (
            <SignupPage
              authSession={authSession}
              onAuthChange={handleAuthSessionChange}
              onNavigate={navigate}
            />
          ) : route.page === 'assistant' ? (
            <AssistantPage key={sessionScopeKey} onNavigate={navigate} />
          ) : route.page === 'leaderboard' ? (
            <LeaderboardPage key={sessionScopeKey} onNavigate={navigate} />
          ) : route.page === 'rewards' ? (
            <RewardsPage key={sessionScopeKey} onNavigate={navigate} />
          ) : (
            <>
              <Hero onNavigate={navigate} />
              <Features />
              <ModernVisualShowcase onNavigate={navigate} />
              <HowItWorks onNavigate={navigate} />
              <CommandCenterPreview onNavigate={navigate} />
              <About />
            </>
          )}
        </main>
        <Footer onNavigate={navigate} />
      </div>

      {/* Persistent Floating AI Cyber Assistant Launcher */}
      <CyberAssistant key={sessionScopeKey} />
    </div>
  )
}

export default App
