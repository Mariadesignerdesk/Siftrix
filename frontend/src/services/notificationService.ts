export type NotificationType = 'alert' | 'threat' | 'system' | 'achievement'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: string
  read: boolean
  link?: string
}

const NOTIFICATION_STORAGE_KEY = 'siftrix_notifications_v1'

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_001_threat',
    title: 'High-Risk Domain Intercepted',
    message: 'A malicious Chase banking credential harvester was flagged and analyzed with 94/100 risk score.',
    type: 'threat',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    link: '/scans/sfx_mock_001_url_phish',
  },
  {
    id: 'notif_002_streak',
    title: 'Security Hunter Streak Active',
    message: '3-Day active investigation streak achieved. You earned +150 XP towards Level 3.',
    type: 'achievement',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: false,
    link: '/rewards',
  },
  {
    id: 'notif_003_system',
    title: 'Threat Intelligence Synchronized',
    message: 'SIFTRIX heuristic ruleset v2.4 initialized with 18,400+ known deceptive domain patterns.',
    type: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    read: true,
  },
  {
    id: 'notif_004_alert',
    title: 'SMS Phishing Campaign Warning',
    message: 'Spike in fraudulent USPS/customs package delivery smishing messages reported this week.',
    type: 'alert',
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    read: true,
    link: '/scans/sfx_mock_002_sms_package',
  },
]

type Listener = (notifications: AppNotification[]) => void
const listeners = new Set<Listener>()

function notifyListeners(items: AppNotification[]) {
  listeners.forEach((fn) => {
    try {
      fn(items)
    } catch {
      // ignore listener error
    }
  })
}

let memoryNotifications: AppNotification[] | null = null

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // fallback
  }
  return null
}

export function getNotifications(): AppNotification[] {
  const storage = getSafeStorage()
  if (storage) {
    try {
      const raw = storage.getItem(NOTIFICATION_STORAGE_KEY)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as AppNotification[]
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // fallback
    }
  }
  return memoryNotifications !== null
    ? memoryNotifications
    : DEFAULT_NOTIFICATIONS
}

function persistNotifications(items: AppNotification[]): void {
  memoryNotifications = items
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }
  notifyListeners(items)
}

export function getUnreadNotificationCount(): number {
  return getNotifications().filter((n) => !n.read).length
}

export function markAsRead(id: string): void {
  const current = getNotifications()
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n))
  persistNotifications(updated)
}

export function markAllAsRead(): void {
  const current = getNotifications()
  const updated = current.map((n) => ({ ...n, read: true }))
  persistNotifications(updated)
}

export function clearNotifications(): void {
  persistNotifications([])
}

export function addNotification(
  item: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification {
  const current = getNotifications()
  const newNotif: AppNotification = {
    ...item,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  }
  persistNotifications([newNotif, ...current])
  return newNotif
}

export function subscribeNotifications(callback: Listener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
