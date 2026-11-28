import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as apiClient from './apiClient'
import LeaderboardPage from '../pages/LeaderboardPage'
import RewardsPage from '../pages/RewardsPage'
import {
  LEGACY_GAMIFICATION_STORAGE_KEY,
  addXp,
  getAchievementBadges,
  getDailyStreakCalendar,
  getGamificationStorageKey,
  getLeaderboardRankings,
  getUserGamificationProfile,
  purgeLegacyGamificationStorage,
  runScopedScanRequest,
  saveAchievementBadges,
  saveUserGamificationProfile,
} from './gamificationService'
import {
  clearNotifications,
  getNotifications,
} from './notificationService'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  loginUser,
  logoutUser,
  verifyCurrentSession,
} from './authService'
import {
  SESSION_ID_HEADER,
  SESSION_ID_STORAGE_KEY,
  clearSessionId,
  saveSessionId,
} from '../utils/session'

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

function buildSignedLikeJwt(sub: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const payload = btoa(JSON.stringify({ sub, exp: 4102444800 }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${payload}.signature_part`
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('gamificationService', () => {
  const hadWindow = 'window' in globalThis
  const originalWindow = globalThis.window
  const hadLocalStorage = 'localStorage' in globalThis
  const originalLocalStorage = globalThis.localStorage

  let localMock: Storage
  let sessionMock: Storage
  let eventTarget: EventTarget

  beforeEach(() => {
    localMock = createStorageMock()
    sessionMock = createStorageMock()
    eventTarget = new EventTarget()

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
    logoutUser()
    clearNotifications()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    logoutUser()
    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }
    if (hadLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('retrieves default user gamification profile', () => {
    const profile = getUserGamificationProfile()
    expect(profile.xp).toBeGreaterThan(0)
    expect(profile.level).toBeGreaterThanOrEqual(1)
    expect(profile.levelTitle).toBeDefined()
    expect(profile.dailyStreak).toBeGreaterThanOrEqual(1)
  })

  it('increments XP, scans count, and recalculates level progression without incrementing threatsNeutralized when verdict is omitted', () => {
    const initial = getUserGamificationProfile()
    const result = addXp(150)

    expect(result.xpEarned).toBe(150)
    expect(result.profile.xp).toBe(initial.xp + 150)
    expect(result.profile.scansCompleted).toBe(initial.scansCompleted + 1)
    expect(result.profile.threatsNeutralized).toBe(initial.threatsNeutralized)
  })

  it('retrieves all achievement badges with metadata', () => {
    const badges = getAchievementBadges()
    expect(badges.length).toBeGreaterThanOrEqual(8)

    const unlocked = badges.filter((b) => b.unlocked)
    expect(unlocked.length).toBeGreaterThanOrEqual(1)

    const categories = new Set(badges.map((b) => b.category))
    expect(categories.has('investigation')).toBe(true)
    expect(categories.has('defense')).toBe(true)
    expect(categories.has('streak')).toBe(true)
    expect(categories.has('mastery')).toBe(true)
  })

  it('retrieves competitive global leaderboard entries', () => {
    const rankings = getLeaderboardRankings()
    expect(rankings.length).toBeGreaterThanOrEqual(5)
    expect(rankings[0].rank).toBe(1)
    expect(rankings[0].xp).toBeGreaterThan(rankings[1].xp)
  })

  it('provides 7-day daily streak calendar data', () => {
    const days = getDailyStreakCalendar()
    expect(days.length).toBe(7)
    expect(days.some((d) => d.active)).toBe(true)
    expect(days.some((d) => d.isToday)).toBe(true)
  })

  describe('Bug 1 — Scoped storage isolation across users, guest sessions, and sessionless guests', () => {
    const userABackend = {
      id: '11111111-aaaa-4bbb-8ccc-111111111111',
      email: 'alice@siftrix.internal',
      full_name: 'Alice Analyst',
      is_active: true,
      created_at: '2026-11-28T01:00:00Z',
    }

    const userBBackend = {
      id: '22222222-aaaa-4bbb-8ccc-222222222222',
      email: 'bob@siftrix.internal',
      full_name: 'Bob Responder',
      is_active: true,
      created_at: '2026-11-28T01:05:00Z',
    }

    it('purges legacy global siftrix_gamification_v2 storage and never leaks it into any scope', () => {
      localMock.setItem(
        LEGACY_GAMIFICATION_STORAGE_KEY,
        JSON.stringify({
          xp: 9999,
          level: 5,
          levelTitle: 'Master Threat Defense Architect',
          currentLevelXp: 499,
          nextLevelXp: 500,
          scansCompleted: 250,
          threatsNeutralized: 200,
          dailyStreak: 45,
          lastActiveDate: '2026-11-27T00:00:00Z',
        })
      )

      const profile = getUserGamificationProfile()
      expect(profile.xp).toBe(1250)
      expect(profile.scansCompleted).toBe(14)
      expect(localMock.getItem(LEGACY_GAMIFICATION_STORAGE_KEY)).toBeNull()

      localMock.setItem(LEGACY_GAMIFICATION_STORAGE_KEY, '{"xp":8888}')
      purgeLegacyGamificationStorage()
      expect(localMock.getItem(LEGACY_GAMIFICATION_STORAGE_KEY)).toBeNull()
    })

    it('isolates XP, scans, threats, streaks, and badges across User A -> logout -> User B and direct account switches', async () => {
      const tokenA = buildSignedLikeJwt(userABackend.id)
      const tokenB = buildSignedLikeJwt(userBBackend.id)

      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenB,
            token_type: 'bearer',
            user: userBBackend,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })

      // 1. User A logs in and builds custom XP, scan count, streak, and unlocked badge state
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${userABackend.id}`
      )

      addXp(100, 'malicious')
      addXp(50, 'suspicious')
      const userAAfterScans = getUserGamificationProfile()
      saveUserGamificationProfile({
        ...userAAfterScans,
        dailyStreak: 19,
      })

      const userABadges = getAchievementBadges().map((b) =>
        b.id === 'badge_ssrf_detector'
          ? { ...b, unlocked: true, unlockedAt: 'Just now', progress: { current: 1, max: 1 } }
          : b
      )
      saveAchievementBadges(userABadges)

      expect(getUserGamificationProfile().xp).toBe(1400)
      expect(getUserGamificationProfile().scansCompleted).toBe(16)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(11)
      expect(getUserGamificationProfile().dailyStreak).toBe(19)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(true)

      // 2. User A logs out -> sessionless guest must NOT see User A's progress or badges
      logoutUser()
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      const guestAfterLogout = getUserGamificationProfile()
      expect(guestAfterLogout.xp).toBe(1250)
      expect(guestAfterLogout.scansCompleted).toBe(14)
      expect(guestAfterLogout.threatsNeutralized).toBe(9)
      expect(guestAfterLogout.dailyStreak).toBe(4)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(false)

      // Orphaned AUTH_STORAGE_KEY without token must NOT expose User A's gamification bucket
      localMock.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          id: userABackend.id,
          name: userABackend.full_name,
          email: userABackend.email,
          role: 'analyst',
          createdAt: userABackend.created_at,
        })
      )
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      expect(getUserGamificationProfile().xp).toBe(1250)
      localMock.removeItem(AUTH_STORAGE_KEY)

      // 3. User B logs in (rememberMe=false) -> completely isolated from User A
      await loginUser({
        email: userBBackend.email,
        password: 'Password123!',
        rememberMe: false,
      })
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${userBBackend.id}`
      )
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().scansCompleted).toBe(14)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(getUserGamificationProfile().dailyStreak).toBe(4)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(false)

      // User B completes a safe scan
      addXp(50, 'safe')
      expect(getUserGamificationProfile().xp).toBe(1300)
      expect(getUserGamificationProfile().scansCompleted).toBe(15)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)

      // 4. Direct switch back to User A preserves all of User A's progress intact
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      const restoredA = getUserGamificationProfile()
      expect(restoredA.xp).toBe(1400)
      expect(restoredA.scansCompleted).toBe(16)
      expect(restoredA.threatsNeutralized).toBe(11)
      expect(restoredA.dailyStreak).toBe(19)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(true)
    })

    it('handles guest -> session promotion, guest -> login, and logout transitions without cross-scope contamination', async () => {
      // 1. Sessionless guest earns XP and unlocks a badge before X-Session-ID exists
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      addXp(100, 'malicious')
      const guestBadges = getAchievementBadges().map((b) =>
        b.id === 'badge_bec_neutralizer' ? { ...b, unlocked: true } : b
      )
      saveAchievementBadges(guestBadges)
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(10)

      // 2. Guest receives X-Session-ID -> promotes sessionless guest progress and cleans up guest fallback bucket
      const guestSessionId = '33333333-4444-4555-8666-777777777777'
      saveSessionId(guestSessionId)
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_sess_${guestSessionId}`
      )
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(10)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_bec_neutralizer')?.unlocked
      ).toBe(true)
      expect(localMock.getItem('siftrix_gamification_guest')).toBeNull()
      expect(localMock.getItem('siftrix_gamification_guest:badges')).toBeNull()

      // Existing guest session progress is never overwritten by a later sessionless guest entry
      clearSessionId()
      addXp(50, 'safe')
      expect(getUserGamificationProfile().xp).toBe(1300)
      saveSessionId(guestSessionId)
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(localMock.getItem('siftrix_gamification_guest')).toBeNull()

      // 3. Guest logs in as User A -> User A starts with User A's own scope (not contaminated by guest),
      // and sessionless guest bucket is purged
      const tokenA = buildSignedLikeJwt(userABackend.id)
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: tokenA,
          token_type: 'bearer',
          user: userABackend,
        },
      })

      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${userABackend.id}`
      )
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_bec_neutralizer')?.unlocked
      ).toBe(false)

      // User A earns XP, then logs out -> subsequent visitor gets clean guest state
      addXp(100, 'malicious')
      expect(getUserGamificationProfile().xp).toBe(1350)

      logoutUser()
      expect(localMock.getItem(SESSION_ID_STORAGE_KEY)).toBeNull()
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_bec_neutralizer')?.unlocked
      ).toBe(false)
    })

    it('Fix 2 — rejects guest migration atomically when destination session already has profile-only OR badges-only data', () => {
      // Split-state Case 1: Destination session has profile-only data (no custom `:badges` key)
      const profileOnlySessionId = '44444444-5555-4666-8777-888888888888'
      saveSessionId(profileOnlySessionId)
      addXp(100, 'malicious')
      addXp(100, 'malicious')
      expect(getUserGamificationProfile().xp).toBe(1450)
      expect(
        localMock.getItem(`siftrix_gamification_sess_${profileOnlySessionId}:badges`)
      ).toBeNull()

      // Switch to sessionless guest and record both guest profile AND custom unlocked guest badge
      clearSessionId()
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      addXp(50, 'suspicious')
      saveAchievementBadges(
        getAchievementBadges().map((b) =>
          b.id === 'badge_ssrf_detector' ? { ...b, unlocked: true } : b
        )
      )
      expect(getUserGamificationProfile().xp).toBe(1300)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(true)

      // Promote to `profileOnlySessionId` -> atomic rejection preserves destination XP (1450)
      // AND refuses to copy guest's unlocked `badge_ssrf_detector` into destination session
      saveSessionId(profileOnlySessionId)
      expect(getUserGamificationProfile().xp).toBe(1450)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(false)
      expect(
        localMock.getItem(`siftrix_gamification_sess_${profileOnlySessionId}:badges`)
      ).toBeNull()
      expect(localMock.getItem('siftrix_gamification_guest')).toBeNull()
      expect(localMock.getItem('siftrix_gamification_guest:badges')).toBeNull()

      // Split-state Case 2: Destination session has badges-only data (no custom profile key)
      clearSessionId()
      const badgesOnlySessionId = '55555555-6666-4777-8888-999999999999'
      saveSessionId(badgesOnlySessionId)
      saveAchievementBadges(
        getAchievementBadges().map((b) =>
          b.id === 'badge_bec_neutralizer' ? { ...b, unlocked: true } : b
        )
      )
      expect(
        localMock.getItem(`siftrix_gamification_sess_${badgesOnlySessionId}`)
      ).toBeNull()

      // Switch to sessionless guest and record high XP + different unlocked badge
      clearSessionId()
      saveUserGamificationProfile({
        ...getUserGamificationProfile(),
        xp: 2200,
        level: 5,
        dailyStreak: 25,
      })
      saveAchievementBadges(
        getAchievementBadges().map((b) =>
          b.id === 'badge_ssrf_detector' ? { ...b, unlocked: true } : b
        )
      )

      // Promote to `badgesOnlySessionId` -> atomic rejection refuses to copy guest's 2200 XP
      // into destination session AND preserves destination's badges untouched
      saveSessionId(badgesOnlySessionId)
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().dailyStreak).toBe(4)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_bec_neutralizer')?.unlocked
      ).toBe(true)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(false)
      expect(localMock.getItem('siftrix_gamification_guest')).toBeNull()
      expect(localMock.getItem('siftrix_gamification_guest:badges')).toBeNull()
    })

    it('Fix 1 — blocks in-flight Scanner completions from awarding XP, threats, or notifications after logout, account switch, or logout->relogin', async () => {
      const tokenA = buildSignedLikeJwt(userABackend.id)
      const tokenB = buildSignedLikeJwt(userBBackend.id)

      const makeMaliciousScanPayload = (id: string) => ({
        id,
        user_id: userABackend.id,
        target_type: 'url' as const,
        target_content: 'https://credential-phish.example/login',
        overall_risk_score: 96,
        verdict: 'malicious' as const,
        risk_level: 'critical' as const,
        summary: { en: 'Phishing site', ur: 'فشنگ سائٹ' },
        recommendations: { en: ['Block URL'], ur: ['بلاک کریں'] },
        agent_findings: {},
        created_at: '2026-11-28T03:00:00Z',
        updated_at: '2026-11-28T03:00:00Z',
      })

      const scanResponseQueue: Array<() => Promise<Response>> = []
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input)
        if (url.endsWith('/api/auth/login')) {
          return new Response(
            JSON.stringify({
              access_token: currentLoginTarget === 'B' ? tokenB : tokenA,
              token_type: 'bearer',
              user: currentLoginTarget === 'B' ? userBBackend : userABackend,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        const nextScanHandler = scanResponseQueue.shift()
        if (!nextScanHandler) {
          throw new Error(`Unexpected fetch call: ${url}`)
        }
        return nextScanHandler()
      })

      let currentLoginTarget: 'A' | 'B' = 'A'

      // 1. User A starts scan -> logs out while scan is in flight -> Guest receives NO XP, threats, or notifications
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      const deferredLogoutScan = createDeferred<Response>()
      scanResponseQueue.push(() => deferredLogoutScan.promise)

      const pendingScan1 = runScopedScanRequest({
        target_type: 'url',
        content: 'https://credential-phish.example/login',
      })

      // User A logs out before scan finishes
      logoutUser()
      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')

      deferredLogoutScan.resolve(
        new Response(JSON.stringify(makeMaliciousScanPayload('scan_stale_logout')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res1 = await pendingScan1
      expect(res1.status).toBe('stale')
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().scansCompleted).toBe(14)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(getNotifications()).toEqual([])

      // 2. User A starts scan -> switches to User B while scan is in flight -> User B receives NO XP, threats, or notifications
      currentLoginTarget = 'A'
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      const deferredSwitchScan = createDeferred<Response>()
      scanResponseQueue.push(() => deferredSwitchScan.promise)

      const pendingScan2 = runScopedScanRequest({
        target_type: 'url',
        content: 'https://credential-phish.example/login',
      })

      currentLoginTarget = 'B'
      await loginUser({
        email: userBBackend.email,
        password: 'Password123!',
        rememberMe: false,
      })
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${userBBackend.id}`
      )

      deferredSwitchScan.resolve(
        new Response(JSON.stringify(makeMaliciousScanPayload('scan_stale_switch')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res2 = await pendingScan2
      expect(res2.status).toBe('stale')
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().scansCompleted).toBe(14)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(getNotifications()).toEqual([])

      // 3. User A starts scan -> logs out -> User A logs back in BEFORE scan resolves -> still invalidated by epoch change
      currentLoginTarget = 'A'
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      const deferredReloginScan = createDeferred<Response>()
      scanResponseQueue.push(() => deferredReloginScan.promise)

      const pendingScan3 = runScopedScanRequest({
        target_type: 'url',
        content: 'https://credential-phish.example/login',
      })

      logoutUser()
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      deferredReloginScan.resolve(
        new Response(JSON.stringify(makeMaliciousScanPayload('scan_stale_relogin')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res3 = await pendingScan3
      expect(res3.status).toBe('stale')
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().scansCompleted).toBe(14)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(getNotifications()).toEqual([])

      // 4. Normal valid scans (authenticated User A AND sessionless guest first-scan X-Session-ID promotion) apply properly
      scanResponseQueue.push(async () =>
        new Response(JSON.stringify(makeMaliciousScanPayload('scan_valid_user_a')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const validUserRes = await runScopedScanRequest({
        target_type: 'url',
        content: 'https://credential-phish.example/login',
      })
      expect(validUserRes.status).toBe('applied')
      if (validUserRes.status === 'applied') {
        expect(validUserRes.xpAward.amount).toBe(100)
      }
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(getUserGamificationProfile().scansCompleted).toBe(15)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(10)
      expect(getNotifications()).toHaveLength(1)
      expect(getNotifications()[0].link).toBe('/scans/scan_valid_user_a')

      logoutUser()
      const assignedGuestSession = '66666666-7777-4888-8999-aaaaaaaaaaaa'
      scanResponseQueue.push(async () =>
        new Response(
          JSON.stringify({
            ...makeMaliciousScanPayload('scan_valid_guest_promo'),
            user_id: assignedGuestSession,
            verdict: 'safe',
            risk_level: 'low',
            overall_risk_score: 5,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              [SESSION_ID_HEADER]: assignedGuestSession,
            },
          }
        )
      )

      const validGuestRes = await runScopedScanRequest({
        target_type: 'url',
        content: 'https://example.org',
      })
      expect(validGuestRes.status).toBe('applied')
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_sess_${assignedGuestSession}`
      )
      expect(getUserGamificationProfile().xp).toBe(1300)
      expect(getUserGamificationProfile().scansCompleted).toBe(15)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
      expect(getNotifications()).toHaveLength(1)
      expect(getNotifications()[0].link).toBe('/scans/scan_valid_guest_promo')
    })

    it('preserves existing valid progress during same-user session restoration and reconciles cross-tab logout', async () => {
      const tokenA = buildSignedLikeJwt(userABackend.id)
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: tokenA,
          token_type: 'bearer',
          user: userABackend,
        },
      })

      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })

      addXp(100, 'malicious')
      addXp(100, 'malicious')
      addXp(50, 'safe')
      expect(getUserGamificationProfile().xp).toBe(1500)
      expect(getUserGamificationProfile().level).toBe(4)
      expect(getUserGamificationProfile().scansCompleted).toBe(17)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(11)

      // Simulate startup verifyCurrentSession() refreshing User A's profile from GET /api/auth/me
      vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          ...userABackend,
          full_name: 'Alice Senior Analyst',
        },
      })

      const verifiedUser = await verifyCurrentSession()
      expect(verifiedUser?.id).toBe(userABackend.id)

      const restored = getUserGamificationProfile()
      expect(restored.xp).toBe(1500)
      expect(restored.level).toBe(4)
      expect(restored.scansCompleted).toBe(17)
      expect(restored.threatsNeutralized).toBe(11)

      // Simulate cross-tab logout in Tab 2 removing AUTH_TOKEN_KEY and AUTH_STORAGE_KEY
      localMock.removeItem(AUTH_TOKEN_KEY)
      localMock.removeItem(AUTH_STORAGE_KEY)
      const crossTabEvent = Object.assign(new Event('storage'), {
        key: AUTH_TOKEN_KEY,
        newValue: null,
        storageArea: localMock,
      }) as StorageEvent
      window.dispatchEvent(crossTabEvent)

      expect(getGamificationStorageKey()).toBe('siftrix_gamification_guest')
      expect(getUserGamificationProfile().xp).toBe(1250)
    })
  })

  describe('Bug 2 — Scan verdict counter accuracy (safe vs suspicious vs malicious)', () => {
    it('never increments threatsNeutralized on safe or omitted-verdict scans, while incrementing on suspicious and malicious verdicts', () => {
      const initial = getUserGamificationProfile()
      expect(initial.xp).toBe(1250)
      expect(initial.scansCompleted).toBe(14)
      expect(initial.threatsNeutralized).toBe(9)

      // 0. Omitted verdict (+50 XP): increments scansCompleted, does NOT increment threatsNeutralized
      const afterOmitted = addXp(50)
      expect(afterOmitted.xpEarned).toBe(50)
      expect(afterOmitted.profile.xp).toBe(1300)
      expect(afterOmitted.profile.scansCompleted).toBe(15)
      expect(afterOmitted.profile.threatsNeutralized).toBe(9)

      // 1. Safe scan (+50 XP): increments scansCompleted, does NOT increment threatsNeutralized
      const afterSafe = addXp(50, 'safe')
      expect(afterSafe.xpEarned).toBe(50)
      expect(afterSafe.profile.xp).toBe(1350)
      expect(afterSafe.profile.scansCompleted).toBe(16)
      expect(afterSafe.profile.threatsNeutralized).toBe(9)

      // Multiple consecutive safe scans still never increment threatsNeutralized
      const afterSecondSafe = addXp(50, 'safe')
      expect(afterSecondSafe.profile.xp).toBe(1400)
      expect(afterSecondSafe.profile.scansCompleted).toBe(17)
      expect(afterSecondSafe.profile.threatsNeutralized).toBe(9)

      // 2. Suspicious scan (+50 XP): increments BOTH scansCompleted and threatsNeutralized
      const afterSuspicious = addXp(50, 'suspicious')
      expect(afterSuspicious.xpEarned).toBe(50)
      expect(afterSuspicious.profile.xp).toBe(1450)
      expect(afterSuspicious.profile.scansCompleted).toBe(18)
      expect(afterSuspicious.profile.threatsNeutralized).toBe(10)

      // 3. Malicious scan (+100 XP): increments BOTH scansCompleted and threatsNeutralized (and levels up across 1500 XP)
      const afterMalicious = addXp(100, 'malicious')
      expect(afterMalicious.xpEarned).toBe(100)
      expect(afterMalicious.leveledUp).toBe(true)
      expect(afterMalicious.profile.xp).toBe(1550)
      expect(afterMalicious.profile.level).toBe(4)
      expect(afterMalicious.profile.scansCompleted).toBe(19)
      expect(afterMalicious.profile.threatsNeutralized).toBe(11)

      // Persisted state matches exact counters
      const reloaded = getUserGamificationProfile()
      expect(reloaded.xp).toBe(1550)
      expect(reloaded.scansCompleted).toBe(19)
      expect(reloaded.threatsNeutralized).toBe(11)
    })
  })

  describe('Storage failure resilience, cross-tab cache reconciliation, and corrupt payload handling', () => {
    it('handles full SecurityError, QuotaExceededError memory precedence, and removeItem failures safely without leaking across users', async () => {
      const userA = {
        id: 'aaaaaaaa-1111-4222-8333-444444444444',
        email: 'quota.alice@siftrix.internal',
        full_name: 'Quota Alice',
        is_active: true,
        created_at: '2026-11-28T02:00:00Z',
      }
      const userB = {
        id: 'bbbbbbbb-1111-4222-8333-444444444444',
        email: 'quota.bob@siftrix.internal',
        full_name: 'Quota Bob',
        is_active: true,
        created_at: '2026-11-28T02:01:00Z',
      }

      // 1. Corrupt JSON in localStorage falls back cleanly without throwing
      localMock.setItem('siftrix_gamification_guest', '{corrupt-json')
      expect(() => getUserGamificationProfile()).not.toThrow()
      expect(getUserGamificationProfile().xp).toBe(1250)

      // 2. QuotaExceededError after initial persisted progress: memory fallback takes precedence over stale localStorage
      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userA.id),
            token_type: 'bearer',
            user: userA,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userB.id),
            token_type: 'bearer',
            user: userB,
          },
        })

      await loginUser({
        email: userA.email,
        password: 'Password123!',
        rememberMe: true,
      })

      addXp(100, 'malicious')
      expect(getUserGamificationProfile().xp).toBe(1350)

      const quotaStorage: Storage = {
        getItem: (key) => localMock.getItem(key),
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: () => {
          throw new Error('SecurityError')
        },
        clear: () => {
          throw new Error('SecurityError')
        },
        get length() {
          return localMock.length
        },
        key: (i) => localMock.key(i),
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: quotaStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: quotaStorage,
        writable: true,
        configurable: true,
      })

      // Even though setItem now throws QuotaExceededError and localMock still holds 1350 XP,
      // memory fallback retains 1400 XP and takes precedence for User A
      expect(() => addXp(50, 'suspicious')).not.toThrow()
      expect(getUserGamificationProfile().xp).toBe(1400)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(11)

      // 3. Full SecurityError on both localStorage and sessionStorage still isolates User B from User A
      const throwingStorage: Storage = {
        getItem: () => {
          throw new Error('SecurityError')
        },
        setItem: () => {
          throw new Error('SecurityError')
        },
        removeItem: () => {
          throw new Error('SecurityError')
        },
        clear: () => {
          throw new Error('SecurityError')
        },
        length: 0,
        key: () => null,
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })

      await loginUser({
        email: userB.email,
        password: 'Password123!',
        rememberMe: false,
      })

      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${userB.id}`
      )
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)
    })

    it('Fix 3 — preserves sessionStorage user in-memory quota fallback across cross-tab localStorage.clear() (key === null) and unrelated storage events', async () => {
      const sessionUser = {
        id: 'f1111111-2222-4333-8444-555555555555',
        email: 'session.quota@siftrix.internal',
        full_name: 'Session Quota Analyst',
        is_active: true,
        created_at: '2026-11-28T02:20:00Z',
      }

      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: buildSignedLikeJwt(sessionUser.id),
          token_type: 'bearer',
          user: sessionUser,
        },
      })

      await loginUser({
        email: sessionUser.email,
        password: 'Password123!',
        rememberMe: false,
      })

      // localStorage.setItem throws QuotaExceededError while getItem/clear work normally
      const quotaLocalStorage: Storage = {
        getItem: (key) => localMock.getItem(key),
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: (key) => localMock.removeItem(key),
        clear: () => localMock.clear(),
        get length() {
          return localMock.length
        },
        key: (i) => localMock.key(i),
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: quotaLocalStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: quotaLocalStorage,
        writable: true,
        configurable: true,
      })

      // User earns XP and unlocks badge in memory fallback (never persisted to localStorage)
      addXp(100, 'malicious')
      saveAchievementBadges(
        getAchievementBadges().map((b) =>
          b.id === 'badge_ssrf_detector' ? { ...b, unlocked: true } : b
        )
      )
      expect(localMock.getItem(`siftrix_gamification_usr_${sessionUser.id}`)).toBeNull()
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(true)

      // Tab 2 clears localStorage (`key: null, newValue: null`) and also fires unrelated events
      localMock.setItem('unrelated_tab2_key', '1')
      localMock.clear()
      window.dispatchEvent(
        Object.assign(new Event('storage'), {
          key: null,
          newValue: null,
          oldValue: null,
          storageArea: quotaLocalStorage,
        }) as StorageEvent
      )
      window.dispatchEvent(new Event('storage'))

      // Independent sessionStorage user's in-memory progress and badges remain intact
      expect(getGamificationStorageKey()).toBe(
        `siftrix_gamification_usr_${sessionUser.id}`
      )
      expect(getUserGamificationProfile().xp).toBe(1350)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(10)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(true)
    })

    it('Fix 3 — invalidates stale in-memory fallback for an inactive user when another tab updates that user in localStorage, while preserving active memory-only progress', async () => {
      const userA = {
        id: 'f2222222-2222-4333-8444-555555555555',
        email: 'inactive.alice@siftrix.internal',
        full_name: 'Inactive Alice',
        is_active: true,
        created_at: '2026-11-28T02:25:00Z',
      }
      const userB = {
        id: 'f3333333-2222-4333-8444-555555555555',
        email: 'active.bob@siftrix.internal',
        full_name: 'Active Bob',
        is_active: true,
        created_at: '2026-11-28T02:26:00Z',
      }

      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userA.id),
            token_type: 'bearer',
            user: userA,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userB.id),
            token_type: 'bearer',
            user: userB,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userA.id),
            token_type: 'bearer',
            user: userA,
          },
        })

      // 1. User A logs in on Tab 1, persists 1350 XP, then hits QuotaExceededError when earning +50 XP (1400 XP in memory)
      await loginUser({
        email: userA.email,
        password: 'Password123!',
        rememberMe: true,
      })
      addXp(100, 'malicious')
      expect(getUserGamificationProfile().xp).toBe(1350)

      let blockGamificationWrites = true
      const toggleQuotaStorage: Storage = {
        getItem: (key) => localMock.getItem(key),
        setItem: (key, val) => {
          if (blockGamificationWrites && key.startsWith('siftrix_gamification_')) {
            throw new Error('QuotaExceededError')
          }
          localMock.setItem(key, val)
        },
        removeItem: (key) => localMock.removeItem(key),
        clear: () => localMock.clear(),
        get length() {
          return localMock.length
        },
        key: (i) => localMock.key(i),
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: toggleQuotaStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: toggleQuotaStorage,
        writable: true,
        configurable: true,
      })

      addXp(50, 'suspicious')
      saveAchievementBadges(
        getAchievementBadges().map((b) =>
          b.id === 'badge_ssrf_detector' ? { ...b, unlocked: true } : b
        )
      )
      expect(getUserGamificationProfile().xp).toBe(1400)

      // 2. Tab 1 switches to User B (sessionStorage), who also earns pure in-memory XP (1300) under quota block
      await loginUser({
        email: userB.email,
        password: 'Password123!',
        rememberMe: false,
      })
      addXp(50, 'safe')
      expect(getUserGamificationProfile().xp).toBe(1300)

      // 3. While User A is INACTIVE in Tab 1, Tab 2 frees quota and writes newer persisted profile (1850 XP)
      // and updated badges for User A into localStorage
      blockGamificationWrites = false
      const userAScopeKey = `siftrix_gamification_usr_${userA.id}`
      const userABadgesKey = `${userAScopeKey}:badges`
      const tab2UpdatedProfile = {
        xp: 1850,
        level: 4,
        levelTitle: 'Principal Cyber Sentinel',
        currentLevelXp: 350,
        nextLevelXp: 500,
        scansCompleted: 24,
        threatsNeutralized: 17,
        dailyStreak: 14,
        lastActiveDate: '2026-11-28T03:30:00Z',
      }
      const tab2UpdatedBadges = getAchievementBadges().map((b) =>
        b.id === 'badge_bec_neutralizer'
          ? { ...b, unlocked: true }
          : { ...b, unlocked: b.id === 'badge_ssrf_detector' ? false : b.unlocked }
      )

      const oldProfileRaw = localMock.getItem(userAScopeKey)
      localMock.setItem(userAScopeKey, JSON.stringify(tab2UpdatedProfile))
      window.dispatchEvent(
        Object.assign(new Event('storage'), {
          key: userAScopeKey,
          oldValue: oldProfileRaw,
          newValue: JSON.stringify(tab2UpdatedProfile),
          storageArea: toggleQuotaStorage,
        }) as StorageEvent
      )

      localMock.setItem(userABadgesKey, JSON.stringify(tab2UpdatedBadges))
      window.dispatchEvent(
        Object.assign(new Event('storage'), {
          key: userABadgesKey,
          oldValue: null,
          newValue: JSON.stringify(tab2UpdatedBadges),
          storageArea: toggleQuotaStorage,
        }) as StorageEvent
      )

      // Active User B's pure in-memory progress (1300 XP) is completely preserved
      expect(getUserGamificationProfile().xp).toBe(1300)

      // 4. User A signs back in on Tab 1 -> receives Tab 2's newer 1850 XP and badges instead of stale 1400 XP memory cache
      await loginUser({
        email: userA.email,
        password: 'Password123!',
        rememberMe: true,
      })
      const reconciledA = getUserGamificationProfile()
      expect(reconciledA.xp).toBe(1850)
      expect(reconciledA.scansCompleted).toBe(24)
      expect(reconciledA.threatsNeutralized).toBe(17)
      expect(reconciledA.dailyStreak).toBe(14)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_bec_neutralizer')?.unlocked
      ).toBe(true)
      expect(
        getAchievementBadges().find((b) => b.id === 'badge_ssrf_detector')?.unlocked
      ).toBe(false)
    })

    it('prevents stale sessionless guest localStorage data from reappearing when removeItem throws on auth transition', async () => {
      // Seed sessionless guest progress in localStorage
      addXp(100, 'malicious')
      expect(localMock.getItem('siftrix_gamification_guest')).not.toBeNull()
      expect(getUserGamificationProfile().xp).toBe(1350)

      // Make removeItem fail while getItem/setItem still work
      const undeletableStorage: Storage = {
        getItem: (key) => localMock.getItem(key),
        setItem: (key, val) => localMock.setItem(key, val),
        removeItem: (key) => {
          if (key.startsWith('siftrix_gamification_guest')) {
            throw new Error('SecurityError: removeItem blocked')
          }
          localMock.removeItem(key)
        },
        clear: () => localMock.clear(),
        get length() {
          return localMock.length
        },
        key: (i) => localMock.key(i),
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: undeletableStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: undeletableStorage,
        writable: true,
        configurable: true,
      })

      const userA = {
        id: 'cccccccc-1111-4222-8333-444444444444',
        email: 'tombstone@siftrix.internal',
        full_name: 'Tombstone User',
        is_active: true,
        created_at: '2026-11-28T02:05:00Z',
      }
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: buildSignedLikeJwt(userA.id),
          token_type: 'bearer',
          user: userA,
        },
      })

      await loginUser({
        email: userA.email,
        password: 'Password123!',
        rememberMe: true,
      })
      logoutUser()

      // Even though removeItem threw and stale JSON remains in localMock, tombstone prevents resurrection
      expect(localMock.getItem('siftrix_gamification_guest')).not.toBeNull()
      expect(getUserGamificationProfile().xp).toBe(1250)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(9)

      // Subsequent legitimate guest scan clears tombstone and saves normally
      addXp(50, 'suspicious')
      expect(getUserGamificationProfile().xp).toBe(1300)
      expect(getUserGamificationProfile().threatsNeutralized).toBe(10)
    })

    it('renders isolated user-specific stats in RewardsPage and LeaderboardPage across User A -> logout -> User B', async () => {
      const userA = {
        id: 'dddddddd-1111-4222-8333-444444444444',
        email: 'rewards.alice@siftrix.internal',
        full_name: 'Rewards Alice',
        is_active: true,
        created_at: '2026-11-28T02:10:00Z',
      }
      const userB = {
        id: 'eeeeeeee-1111-4222-8333-444444444444',
        email: 'rewards.bob@siftrix.internal',
        full_name: 'Rewards Bob',
        is_active: true,
        created_at: '2026-11-28T02:11:00Z',
      }

      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userA.id),
            token_type: 'bearer',
            user: userA,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: buildSignedLikeJwt(userB.id),
            token_type: 'bearer',
            user: userB,
          },
        })

      await loginUser({
        email: userA.email,
        password: 'Password123!',
        rememberMe: true,
      })
      addXp(100, 'malicious')
      addXp(100, 'malicious')
      saveUserGamificationProfile({
        ...getUserGamificationProfile(),
        dailyStreak: 12,
      })

      const userARewardsHtml = renderToStaticMarkup(
        createElement(RewardsPage, { onNavigate: vi.fn() })
      )
      const userALeaderboardHtml = renderToStaticMarkup(
        createElement(LeaderboardPage, { onNavigate: vi.fn() })
      )
      expect(userARewardsHtml).toContain('1,450')
      expect(userARewardsHtml).toContain('12-Day Streak')
      expect(userALeaderboardHtml).toContain('(1450 XP)')

      logoutUser()
      await loginUser({
        email: userB.email,
        password: 'Password123!',
        rememberMe: false,
      })

      const userBRewardsHtml = renderToStaticMarkup(
        createElement(RewardsPage, { onNavigate: vi.fn() })
      )
      const userBLeaderboardHtml = renderToStaticMarkup(
        createElement(LeaderboardPage, { onNavigate: vi.fn() })
      )
      expect(userBRewardsHtml).not.toContain('1,450')
      expect(userBRewardsHtml).not.toContain('12-Day Streak')
      expect(userBRewardsHtml).toContain('1,250')
      expect(userBRewardsHtml).toContain('4-Day Streak')
      expect(userBLeaderboardHtml).toContain('(1250 XP)')
    })
  })
})
