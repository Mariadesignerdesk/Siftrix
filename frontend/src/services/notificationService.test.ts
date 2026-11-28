import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  addNotification,
  clearNotifications,
  getNotifications,
  getNotificationStorageKey,
  getUnreadNotificationCount,
  markAllAsRead,
  markAsRead,
  purgeLegacyStorage,
  subscribeNotifications,
  LEGACY_NOTIFICATION_STORAGE_KEY,
} from './notificationService'
import {
  AUTH_PREVIEW_STORAGE_KEY,
  saveAuthPreviewSession,
} from '../utils/authPreview'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  getActiveUser,
  logoutUser,
  mockLogin,
} from './authService'

function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] || null,
  }
}

function setupStorageMock() {
  const localMock = createStorageMock()
  const sessionMock = createStorageMock()
  const eventTarget = new EventTarget()

  Object.defineProperty(globalThis, 'localStorage', {
    value: localMock,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: localMock,
      sessionStorage: sessionMock,
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    },
    writable: true,
    configurable: true,
  })
}

setupStorageMock()

describe('notificationService', () => {
  beforeEach(() => {
    logoutUser()
    localStorage.clear()
    window.sessionStorage.clear()
    clearNotifications()
  })

  afterEach(() => {
    logoutUser()
    localStorage.clear()
    window.sessionStorage.clear()
  })

  it('starts with a clean empty state for new users and sessions', () => {
    expect(getNotifications()).toEqual([])
    expect(getNotifications().length).toBe(0)
    expect(getUnreadNotificationCount()).toBe(0)
  })

  it('adds and retrieves real scan notifications accurately', () => {
    const notif = addNotification({
      title: 'Credential Harvest Blocked',
      message: 'Suspicious domain intercepted.',
      type: 'threat',
      link: '/scans/scan_real_001',
    })

    expect(notif.id).toBeDefined()
    expect(notif.read).toBe(false)
    expect(notif.link).toBe('/scans/scan_real_001')
    expect(getNotifications().length).toBe(1)
    expect(getUnreadNotificationCount()).toBe(1)
  })

  it('prevents duplicate notifications for the same scan event', () => {
    const first = addNotification({
      title: 'Malicious Threat Isolated',
      message: 'Analyzed phishing URL. +100 XP awarded.',
      type: 'threat',
      link: '/scans/scan_duplicate_check_01',
    })

    // Submitting the same scan result again
    const second = addNotification({
      title: 'Malicious Threat Isolated',
      message: 'Analyzed phishing URL. +100 XP awarded.',
      type: 'threat',
      link: '/scans/scan_duplicate_check_01',
    })

    expect(second.id).toBe(first.id)
    expect(getNotifications().length).toBe(1)
  })

  it('prevents duplicate notifications with identical title and message when link is absent', () => {
    const first = addNotification({
      title: 'Heuristic Rule Triggered',
      message: 'High entropy domain pattern observed.',
      type: 'alert',
    })

    const second = addNotification({
      title: 'Heuristic Rule Triggered',
      message: 'High entropy domain pattern observed.',
      type: 'alert',
    })

    expect(second.id).toBe(first.id)
    expect(getNotifications().length).toBe(1)
  })

  it('marks notifications as read', () => {
    const notif = addNotification({
      title: 'System Update',
      message: 'Signatures updated.',
      type: 'system',
    })

    markAsRead(notif.id)
    expect(getUnreadNotificationCount()).toBe(0)
    expect(getNotifications()[0].read).toBe(true)
  })

  it('marks all notifications as read at once', () => {
    addNotification({ title: 'A', message: 'a', type: 'alert' })
    addNotification({ title: 'B', message: 'b', type: 'threat' })
    expect(getUnreadNotificationCount()).toBe(2)

    markAllAsRead()
    expect(getUnreadNotificationCount()).toBe(0)
  })

  it('subscribes to notification state changes', () => {
    let callCount = 0
    const unsub = subscribeNotifications(() => {
      callCount++
    })

    addNotification({ title: 'Ping', message: 'Test message', type: 'system' })
    expect(callCount).toBe(1)

    unsub()
    addNotification({ title: 'Ping 2', message: 'Test message 2', type: 'system' })
    expect(callCount).toBe(1)
  })

  it('purges legacy shared notification storage key on initialization', () => {
    localStorage.setItem(
      LEGACY_NOTIFICATION_STORAGE_KEY,
      JSON.stringify([{ id: 'fake_mock_001', title: 'Old Mock' }])
    )
    expect(localStorage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY)).not.toBeNull()

    purgeLegacyStorage()
    expect(localStorage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY)).toBeNull()
  })

  it('isolates notifications between authenticated accounts and sessions', () => {
    // 1. Account Alpha signs in
    const userAlpha = {
      id: 'usr_alpha_99',
      name: 'Analyst Alpha',
      email: 'alpha@siftrix.com',
      role: 'analyst' as const,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(AUTH_TOKEN_KEY, 'jwt_alpha_99')
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userAlpha))
    expect(getNotificationStorageKey()).toBe('siftrix_notifications_usr_usr_alpha_99')

    // Starts clean and empty
    expect(getNotifications().length).toBe(0)

    // Alpha records a scan notification
    addNotification({
      title: 'Alpha Threat Detected',
      message: 'Investigated by Alpha.',
      type: 'threat',
      link: '/scans/scan_alpha_01',
    })
    expect(getNotifications().length).toBe(1)
    expect(getNotifications()[0].title).toBe('Alpha Threat Detected')

    // 2. Account Beta signs in
    const userBeta = {
      id: 'usr_beta_42',
      name: 'Analyst Beta',
      email: 'beta@siftrix.com',
      role: 'analyst' as const,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(AUTH_TOKEN_KEY, 'jwt_beta_42')
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userBeta))
    expect(getNotificationStorageKey()).toBe('siftrix_notifications_usr_usr_beta_42')

    // Beta must start clean and cannot see Alpha's notifications
    expect(getNotifications().length).toBe(0)

    // Beta records their own scan notification
    addNotification({
      title: 'Beta System Scan',
      message: 'Investigated by Beta.',
      type: 'system',
      link: '/scans/scan_beta_01',
    })
    expect(getNotifications().length).toBe(1)
    expect(getNotifications()[0].title).toBe('Beta System Scan')

    // 3. Beta logs out
    logoutUser()
    expect(getNotificationStorageKey()).not.toContain('usr_beta_42')

    // Unauthenticated/guest session cannot inherit Beta's or Alpha's notifications
    expect(getNotifications().find((n) => n.title === 'Alpha Threat Detected')).toBeUndefined()
    expect(getNotifications().find((n) => n.title === 'Beta System Scan')).toBeUndefined()

    // Orphaned user record without an active token must NOT expose Alpha's notification bucket
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userAlpha))
    expect(getNotificationStorageKey()).toBe('siftrix_notifications_guest')
    expect(getNotifications()).toEqual([])

    // 4. Alpha logs back in with a valid token -> Alpha's notifications are isolated and preserved
    localStorage.setItem(AUTH_TOKEN_KEY, 'jwt_alpha_99')
    expect(getNotificationStorageKey()).toBe('siftrix_notifications_usr_usr_alpha_99')
    const alphaItems = getNotifications()
    expect(alphaItems.length).toBe(1)
    expect(alphaItems[0].title).toBe('Alpha Threat Detected')
    expect(alphaItems.find((n) => n.title === 'Beta System Scan')).toBeUndefined()
  })

  it('prevents User A identity and notifications from leaking into guest session on logoutUser or into User B rememberMe=false session', async () => {
    // 1. User A signs in with rememberMe=true and active UI preview session
    const userALogin = await mockLogin({
      email: 'alice.analyst@siftrix.com',
      password: 'Password123!',
      rememberMe: true,
    })
    expect(userALogin.success).toBe(true)
    const userAId = userALogin.user!.id

    saveAuthPreviewSession({
      name: userALogin.user!.name,
      email: userALogin.user!.email,
      mode: 'signin',
      createdAt: userALogin.user!.createdAt,
    })

    addNotification({
      title: 'Alice Private Incident',
      message: 'Confidential phishing investigation for Alice.',
      type: 'threat',
      link: '/scans/scan_alice_private_01',
    })

    expect(getActiveUser()?.id).toBe(userAId)
    expect(getNotifications().map((n) => n.title)).toEqual(['Alice Private Incident'])

    // 2. Centralized logoutUser() runs (as triggered by UI Sign Out handlers)
    let authChangeFired = false
    const onAuthChange = () => {
      authChangeFired = true
    }
    window.addEventListener('siftrix:auth-change', onAuthChange)

    logoutUser()
    window.removeEventListener('siftrix:auth-change', onAuthChange)

    expect(authChangeFired).toBe(true)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(AUTH_PREVIEW_STORAGE_KEY)).toBeNull()
    expect(getActiveUser()).toBeNull()
    expect(getNotificationStorageKey()).toBe('siftrix_notifications_guest')
    expect(getNotifications()).toEqual([])
    expect(getUnreadNotificationCount()).toBe(0)

    // 3. Stale localStorage regression check: User A signs in with rememberMe=true,
    // then User B signs in directly with rememberMe=false without prior logout
    const userARelogin = await mockLogin({
      email: 'alice.analyst@siftrix.com',
      password: 'Password123!',
      rememberMe: true,
    })
    expect(userARelogin.success).toBe(true)
    addNotification({
      title: 'Alice Relogin Alert',
      message: 'Scoped to Alice second session.',
      type: 'alert',
    })
    expect(getNotifications().length).toBe(1)

    const userBLogin = await mockLogin({
      email: 'bob.responder@siftrix.com',
      password: 'Password123!',
      rememberMe: false,
    })
    expect(userBLogin.success).toBe(true)

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(getActiveUser()?.email).toBe('bob.responder@siftrix.com')
    expect(getNotificationStorageKey()).toBe(
      `siftrix_notifications_usr_${userBLogin.user!.id}`
    )
    expect(getNotifications()).toEqual([])
    expect(getUnreadNotificationCount()).toBe(0)
  })
})
