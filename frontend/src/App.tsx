import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Scanner from './components/Scanner'
import HowItWorks from './components/HowItWorks'
import CommandCenterPreview from './components/CommandCenterPreview'
import About from './components/About'
import Footer from './components/Footer'
import CinematicIntro from './components/CinematicIntro'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ScanDetailsPage from './pages/ScanDetailsPage'
import ScanHistoryPage from './pages/ScanHistoryPage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import AssistantPage from './pages/AssistantPage'
import LeaderboardPage from './pages/LeaderboardPage'
import RewardsPage from './pages/RewardsPage'
import CyberAssistant from './components/chat/CyberAssistant'
import PwaInstallBanner from './components/pwa/PwaInstallBanner'
import {
  clearAuthPreviewSession,
  loadAuthPreviewSession,
  type AuthPreviewSession,
} from './utils/authPreview'
import { useAppRouter } from './utils/router'

function App() {
  const { route, navigate } = useAppRouter()
  const [authSession, setAuthSession] = useState<AuthPreviewSession | null>(
    () => loadAuthPreviewSession()
  )

  const handleSignOut = () => {
    clearAuthPreviewSession()
    setAuthSession(null)
  }

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
          {route.page === 'dashboard' ? (
            <DashboardPage onNavigate={navigate} />
          ) : route.page === 'history' ? (
            <ScanHistoryPage onNavigate={navigate} />
          ) : route.page === 'scan-details' ? (
            <ScanDetailsPage
              key={route.scanId}
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
              onAuthChange={setAuthSession}
              onNavigate={navigate}
            />
          ) : route.page === 'signup' ? (
            <SignupPage
              authSession={authSession}
              onAuthChange={setAuthSession}
              onNavigate={navigate}
            />
          ) : route.page === 'assistant' ? (
            <AssistantPage onNavigate={navigate} />
          ) : route.page === 'leaderboard' ? (
            <LeaderboardPage onNavigate={navigate} />
          ) : route.page === 'rewards' ? (
            <RewardsPage onNavigate={navigate} />
          ) : (
            <>
              <Hero />
              <Features />
              <Scanner />
              <HowItWorks onNavigate={navigate} />
              <CommandCenterPreview onNavigate={navigate} />
              <About />
            </>
          )}
        </main>
        <Footer onNavigate={navigate} />
      </div>

      {/* Persistent Floating AI Cyber Assistant Launcher */}
      <CyberAssistant />
    </div>
  )
}

export default App
