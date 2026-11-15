import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  addXp,
  getAchievementBadges,
  getCurrentUserRank,
  getDailyStreakCalendar,
  getLeaderboardRankings,
  getUserGamificationProfile,
  resetGamificationStateOnSignOut,
  saveUserGamificationProfile,
  setActiveGamificationUserId,
  syncScansCompleted,
} from './gamificationService'
import { clearSessionId, saveSessionId } from '../utils/session'

function createMockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, val)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  }
}

describe('gamificationService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage())
    vi.stubGlobal('sessionStorage', createMockStorage())
    clearSessionId()
    resetGamificationStateOnSignOut()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('retrieves default user gamification profile', () => {
    const profile = getUserGamificationProfile()
    expect(profile.xp).toBeGreaterThan(0)
    expect(profile.level).toBeGreaterThanOrEqual(1)
    expect(profile.levelTitle).toBeDefined()
    expect(profile.dailyStreak).toBeGreaterThanOrEqual(1)
  })

  it('increments XP, scans count, and recalculates level progression', () => {
    const initial = getUserGamificationProfile()
    const result = addXp(150)

    expect(result.xpEarned).toBe(150)
    expect(result.profile.xp).toBe(initial.xp + 150)
    expect(result.profile.scansCompleted).toBe(initial.scansCompleted + 1)
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

  it('correctly handles Sunday as today in the 7-day streak calendar', () => {
    // Sunday, Nov 15, 2026
    const sundayDate = new Date(2026, 10, 15)
    const profile = { ...getUserGamificationProfile(), dailyStreak: 4 }
    const days = getDailyStreakCalendar(profile, sundayDate)

    expect(days).toHaveLength(7)
    expect(days.map((d) => d.dayName)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    // Sunday (index 6) must be isToday
    expect(days[6].isToday).toBe(true)
    expect(days[6].dayNumber).toBe(15)
    expect(days.filter((d) => d.isToday)).toHaveLength(1)

    // Monday (index 0) is 6 days ago (Nov 9)
    expect(days[0].dayNumber).toBe(9)

    // With streak = 4 on Sunday:
    // Sunday (today), Saturday, Friday, Thursday are active; Wed, Tue, Mon are inactive
    expect(days[6].active).toBe(true)
    expect(days[5].active).toBe(true)
    expect(days[4].active).toBe(true)
    expect(days[3].active).toBe(true)
    expect(days[2].active).toBe(false)
    expect(days[1].active).toBe(false)
    expect(days[0].active).toBe(false)
  })

  it('correctly handles month boundaries in the 7-day streak calendar', () => {
    // Wednesday, April 1, 2026 (March 31 was Tuesday, March 30 was Monday)
    const monthBoundaryDate = new Date(2026, 3, 1)
    const profile = { ...getUserGamificationProfile(), dailyStreak: 3 }
    const days = getDailyStreakCalendar(profile, monthBoundaryDate)

    expect(days).toHaveLength(7)
    // Day numbers across boundary: Mon Mar 30, Tue Mar 31, Wed Apr 1, Thu Apr 2, Fri Apr 3, Sat Apr 4, Sun Apr 5
    expect(days.map((d) => d.dayNumber)).toEqual([30, 31, 1, 2, 3, 4, 5])
    expect(days[2].dayName).toBe('Wed')
    expect(days[2].isToday).toBe(true)

    // With streak = 3 on Wednesday:
    // Wed (today), Tue (yesterday), Mon (2 days ago) are active; Thu..Sun are future (inactive)
    expect(days[0].active).toBe(true)
    expect(days[1].active).toBe(true)
    expect(days[2].active).toBe(true)
    expect(days[3].active).toBe(false)
    expect(days[4].active).toBe(false)
    expect(days[5].active).toBe(false)
    expect(days[6].active).toBe(false)
  })

  it('correctly handles year boundaries in the 7-day streak calendar', () => {
    // Thursday, Jan 1, 2026 (Dec 29 was Mon, Dec 30 was Tue, Dec 31 was Wed)
    const yearBoundaryDate = new Date(2026, 0, 1)
    const profile = { ...getUserGamificationProfile(), dailyStreak: 2 }
    const days = getDailyStreakCalendar(profile, yearBoundaryDate)

    expect(days).toHaveLength(7)
    // Day numbers across boundary: Mon Dec 29, Tue Dec 30, Wed Dec 31, Thu Jan 1, Fri Jan 2, Sat Jan 3, Sun Jan 4
    expect(days.map((d) => d.dayNumber)).toEqual([29, 30, 31, 1, 2, 3, 4])
    expect(days[3].dayName).toBe('Thu')
    expect(days[3].isToday).toBe(true)

    // With streak = 2 on Thursday:
    // Thu (today), Wed (yesterday) are active; Mon, Tue are inactive; Fri..Sun are future
    expect(days[0].active).toBe(false)
    expect(days[1].active).toBe(false)
    expect(days[2].active).toBe(true)
    expect(days[3].active).toBe(true)
    expect(days[4].active).toBe(false)
    expect(days[5].active).toBe(false)
    expect(days[6].active).toBe(false)
  })

  it('ensures current user XP and scan count match profile and actual scan count (not hardcoded to 1250 or 14)', () => {
    // 1. Check default profile matches leaderboard row
    const defaultProfile = getUserGamificationProfile()
    let rankings = getLeaderboardRankings()
    let currentUserEntry = rankings.find((r) => r.isCurrentUser)

    expect(currentUserEntry).toBeDefined()
    expect(currentUserEntry?.xp).toBe(defaultProfile.xp)
    expect(currentUserEntry?.scansCount).toBe(defaultProfile.scansCompleted)

    // 2. Update profile with custom XP and sync scan count
    addXp(300)
    syncScansCompleted(27)

    const updatedProfile = getUserGamificationProfile()
    expect(updatedProfile.xp).toBe(defaultProfile.xp + 300)
    expect(updatedProfile.scansCompleted).toBe(27)

    rankings = getLeaderboardRankings()
    currentUserEntry = rankings.find((r) => r.isCurrentUser)
    expect(currentUserEntry?.xp).toBe(updatedProfile.xp)
    expect(currentUserEntry?.scansCount).toBe(27)
    expect(currentUserEntry?.xp).not.toBe(1250)
    expect(currentUserEntry?.scansCount).not.toBe(14)

    // 3. Explicit actual scan count override (e.g. from fetchScans)
    const withCustomScans = getLeaderboardRankings(updatedProfile, 3)
    const customScansEntry = withCustomScans.find((r) => r.isCurrentUser)
    expect(customScansEntry?.scansCount).toBe(3)
    expect(customScansEntry?.xp).toBe(updatedProfile.xp)
  })

  it('calculates consistent ranking order and 1-based rank numbers for all XP tiers', () => {
    // 1. Verify descending order and consecutive 1-based ranks
    const rankings = getLeaderboardRankings()
    for (let i = 0; i < rankings.length - 1; i += 1) {
      expect(rankings[i].xp).toBeGreaterThanOrEqual(rankings[i + 1].xp)
      expect(rankings[i].rank).toBe(i + 1)
    }
    expect(rankings[rankings.length - 1].rank).toBe(rankings.length)

    // 2. High XP pushes current user to Rank #1
    const highXpProfile = { ...getUserGamificationProfile(), xp: 5200 }
    const topRankings = getLeaderboardRankings(highXpProfile)
    expect(topRankings[0].isCurrentUser).toBe(true)
    expect(topRankings[0].rank).toBe(1)
    expect(getCurrentUserRank(5200)).toBe(1)

    // 3. Intermediate XP (3500) places current user at Rank #3 (behind Tariq 4850 and Elena 3920, ahead of Marcus 3100)
    const midXpProfile = { ...getUserGamificationProfile(), xp: 3500 }
    const midRankings = getLeaderboardRankings(midXpProfile)
    const midEntry = midRankings.find((r) => r.isCurrentUser)
    expect(midEntry?.rank).toBe(3)
    expect(getCurrentUserRank(3500)).toBe(3)

    // 4. Low XP (500) places current user at the bottom (Rank #8)
    const lowXpProfile = { ...getUserGamificationProfile(), xp: 500 }
    const lowRankings = getLeaderboardRankings(lowXpProfile)
    const lowEntry = lowRankings.find((r) => r.isCurrentUser)
    expect(lowEntry?.rank).toBe(8)
    expect(getCurrentUserRank(500)).toBe(8)
  })

  it('isolates gamification data between two authenticated accounts and guest sessions', () => {
    // 1. Guest session starts and earns XP
    const guestInitial = getUserGamificationProfile()
    expect(guestInitial.xp).toBe(1250)
    addXp(100)
    expect(getUserGamificationProfile().xp).toBe(1350)

    // 2. User A logs in -> gets isolated storage
    setActiveGamificationUserId('user_a_uuid')
    const userAProfile = getUserGamificationProfile()
    expect(userAProfile.xp).toBe(1250) // starts at initial, not guest's 1350
    addXp(400) // User A gains 400 -> 1650
    expect(getUserGamificationProfile().xp).toBe(1650)

    // 3. User B logs in -> gets isolated storage
    setActiveGamificationUserId('user_b_uuid')
    const userBProfile = getUserGamificationProfile()
    expect(userBProfile.xp).toBe(1250) // not User A's 1650 or Guest's 1350
    addXp(800) // User B gains 800 -> 2050
    expect(getUserGamificationProfile().xp).toBe(2050)

    // 4. Switch back to User A -> User A still has 1650
    setActiveGamificationUserId('user_a_uuid')
    expect(getUserGamificationProfile().xp).toBe(1650)

    // 5. Switch back to Guest -> Guest still has 1350
    setActiveGamificationUserId(null)
    expect(getUserGamificationProfile().xp).toBe(1350)

    // 6. Distinct guest session IDs also isolate
    saveSessionId('guest-session-uuid-2')
    const distinctGuest = getUserGamificationProfile()
    expect(distinctGuest.xp).toBe(1250)
    addXp(50)
    expect(getUserGamificationProfile().xp).toBe(1300)
  })

  it('prevents XP and progress leakage on logout and account switching', () => {
    // 1. User A logs in, reaches 3200 XP and completes 35 scans
    setActiveGamificationUserId('analyst_alpha_id')
    const profileA = getUserGamificationProfile()
    saveUserGamificationProfile({
      ...profileA,
      xp: 3200,
      scansCompleted: 35,
    })
    expect(getUserGamificationProfile().xp).toBe(3200)

    // 2. Sign out -> resets active user
    resetGamificationStateOnSignOut()

    // 3. Logged out guest does NOT see User A's 3200 XP or 35 scans
    const loggedOutProfile = getUserGamificationProfile()
    expect(loggedOutProfile.xp).not.toBe(3200)
    expect(loggedOutProfile.scansCompleted).not.toBe(35)

    // 4. User B logs in -> does NOT see User A's 3200 XP
    setActiveGamificationUserId('analyst_beta_id')
    const userBProfile = getUserGamificationProfile()
    expect(userBProfile.xp).not.toBe(3200)
    expect(userBProfile.scansCompleted).not.toBe(35)

    // 5. User A logs back in -> User A retrieves their 3200 XP and 35 scans
    setActiveGamificationUserId('analyst_alpha_id')
    expect(getUserGamificationProfile().xp).toBe(3200)
    expect(getUserGamificationProfile().scansCompleted).toBe(35)
  })
})
