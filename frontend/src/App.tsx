import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Scanner from './components/Scanner'
import Features from './components/Features'
import About from './components/About'
import Footer from './components/Footer'
import DashboardPage from './pages/DashboardPage'
import ScanDetailsPage from './pages/ScanDetailsPage'
import ScanHistoryPage from './pages/ScanHistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useAppRouter } from './utils/router'

function App() {
  const { route, navigate } = useAppRouter()

  return (
    <div
      className="min-h-screen bg-siftrix-navy text-siftrix-soft flex flex-col"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(73, 59, 120, 0.34), transparent 70%)',
      }}
    >
      <Navbar currentPage={route.page} onNavigate={navigate} />
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
          <SettingsPage onNavigate={navigate} />
        ) : (
          <>
            <Hero />
            <Scanner />
            <Features />
            <About />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
