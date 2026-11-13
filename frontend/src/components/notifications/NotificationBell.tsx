import { useEffect, useRef, useState } from 'react'
import {
  clearNotifications,
  getNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  markAsRead,
  subscribeNotifications,
  type AppNotification,
} from '../../services/notificationService'
import type { AppPath, NavigateFn } from '../../utils/router'

interface NotificationBellProps {
  onNavigate: NavigateFn
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications()
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = subscribeNotifications((items) => {
      setNotifications(items)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = getUnreadNotificationCount()

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id)
    if (notif.link) {
      setIsOpen(false)
      onNavigate(notif.link as AppPath)
    }
  }

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'threat':
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 border border-red-500/40 text-red-500 shrink-0 text-xs font-bold">
            ⚠️
          </span>
        )
      case 'achievement':
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-siftrix-gold/15 border border-siftrix-gold/40 text-siftrix-gold shrink-0 text-xs font-bold">
            🏆
          </span>
        )
      case 'alert':
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-500 shrink-0 text-xs font-bold">
            ⚡
          </span>
        )
      default:
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-siftrix-charcoal/15 border border-siftrix-charcoal/40 text-siftrix-graphite shrink-0 text-xs font-bold">
            ℹ️
          </span>
        )
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Security alerts and notifications (${unreadCount} unread)`}
        className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-siftrix-border bg-white text-siftrix-charcoal hover:border-siftrix-gold hover:bg-siftrix-pearl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold shadow-2xs"
      >
        <svg
          aria-hidden="true"
          className="h-4.5 w-4.5 sm:h-5 sm:w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-siftrix-gold/40 bg-siftrix-pearl shadow-2xl z-50 overflow-hidden animate-siftrix-enter">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-siftrix-border/80 bg-siftrix-charcoal px-4 py-3 text-siftrix-beige">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-siftrix-champagne">
                Security Alerts ({unreadCount} new)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-siftrix-champagne/90 hover:text-white cursor-pointer transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={clearNotifications}
                className="text-[11px] font-medium text-[#A59F94] hover:text-white cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-siftrix-border/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-xs font-semibold text-siftrix-charcoal">
                  All alerts acknowledged
                </p>
                <p className="text-[11px] text-siftrix-muted">
                  No new security incidents or telemetry warnings.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                    notif.read
                      ? 'bg-transparent hover:bg-siftrix-beige/60 text-siftrix-muted-dark'
                      : 'bg-white/80 hover:bg-white text-siftrix-graphite font-medium'
                  }`}
                >
                  {getTypeIcon(notif.type)}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-xs font-bold text-siftrix-charcoal truncate">
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-siftrix-muted-dark line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-siftrix-muted pt-0.5">
                      {new Date(notif.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-siftrix-border/70 bg-siftrix-beige/60 px-4 py-2 text-center">
            <span className="text-[10px] uppercase tracking-wider text-siftrix-muted-dark font-semibold">
              SIFTRIX Threat Alert Center
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
