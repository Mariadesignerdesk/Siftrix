import { describe, it, expect, beforeEach } from 'vitest'
import {
  addNotification,
  clearNotifications,
  getNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  markAsRead,
  subscribeNotifications,
} from './notificationService'

describe('notificationService', () => {
  beforeEach(() => {
    clearNotifications()
  })

  it('starts empty after clear', () => {
    expect(getNotifications().length).toBe(0)
    expect(getUnreadNotificationCount()).toBe(0)
  })

  it('adds and retrieves notifications accurately', () => {
    const notif = addNotification({
      title: 'Credential Harvest Blocked',
      message: 'Suspicious domain intercepted.',
      type: 'threat',
    })

    expect(notif.id).toBeDefined()
    expect(notif.read).toBe(false)
    expect(getNotifications().length).toBe(1)
    expect(getUnreadNotificationCount()).toBe(1)
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

  it('marks all as read at once', () => {
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
})
