import { getActiveUser } from './authService'
import { loadSessionId } from '../utils/session'

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

/**
 * Legacy storage key used previously when all users shared a single bucket
 * and were seeded with hardcoded mock alerts. This is removed on initialization.
 */
export const LEGACY_NOTIFICATION_STORAGE_KEY = 'siftrix_notifications_v1'

/**
 * New accounts start with a clean empty list. Hardcoded mock alerts have been removed.
 */
const DEFAULT_NOTIFICATIONS: AppNotification[] = []

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

// In-memory cache partitioned by scope key to prevent leakage across users/sessions
const memoryStores: Record<string, AppNotification[]> = {}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
  } catch {
    // fallback
  }
  return null
}

/**
 * Purges the legacy shared mock notification key from local storage
 * to prevent mixing old synthetic alerts into the updated architecture.
 */
export function purgeLegacyStorage(): void {
  const storage = getSafeStorage()
  if (storage) {
    try {
      if (storage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY) !== null) {
        storage.removeItem(LEGACY_NOTIFICATION_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Derives a dedicated storage key scoped to the active user or session.
 *
 * SECURITY & ARCHITECTURAL NOTICE:
 * Client-side localStorage scoping provides data hygiene and prevents cross-session
 * UI leakage in the browser. It does NOT constitute server-grade access control.
 * In a full production implementation with backend persistence, notifications
 * must be queried from an authenticated endpoint (e.g., /api/notifications) with
 * token-based server authorization and database-level tenancy constraints.
 */
export function getNotificationStorageKey(): string {
  const user = getActiveUser()
  if (user && user.id) {
    return `siftrix_notifications_usr_${user.id}`
  }
  const sessionId = loadSessionId()
  if (sessionId) {
    return `siftrix_notifications_sess_${sessionId}`
  }
  return 'siftrix_notifications_guest'
}

export function getNotifications(): AppNotification[] {
  purgeLegacyStorage()
  const key = getNotificationStorageKey()
  const storage = getSafeStorage()
  if (storage) {
    try {
      const raw = storage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as AppNotification[]
        if (Array.isArray(parsed)) {
          memoryStores[key] = parsed
          return parsed
        }
      }
    } catch {
      // fallback
    }
  }
  return memoryStores[key] !== undefined ? memoryStores[key] : DEFAULT_NOTIFICATIONS
}

function persistNotifications(items: AppNotification[]): void {
  const key = getNotificationStorageKey()
  memoryStores[key] = items
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(items))
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

/**
 * Appends a verified notification to the current user's feed.
 * Automatically deduplicates matching scan events (by link or identical title+message).
 */
export function addNotification(
  item: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification {
  const current = getNotifications()

  // Deduplicate against existing notifications for the same event
  const existing = current.find((n) => {
    if (item.link && n.link) {
      return n.link === item.link
    }
    return n.title === item.title && n.message === item.message
  })

  if (existing) {
    return existing
  }

  const newNotif: AppNotification = {
    ...item,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  }

  // Cap at 50 notifications to prevent unbounded local storage growth
  const updated = [newNotif, ...current].slice(0, 50)
  persistNotifications(updated)
  return newNotif
}

export function subscribeNotifications(callback: Listener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

// Auto-synchronize when session/auth state switches
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('siftrix:auth-change', () => {
      notifyListeners(getNotifications())
    })
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('siftrix_notifications_')) {
        notifyListeners(getNotifications())
      }
    })
  } catch {
    // non-browser or test runner
  }
}
