import { describe, it, expect } from 'vitest'
import {
  addXp,
  getAchievementBadges,
  getDailyStreakCalendar,
  getLeaderboardRankings,
  getUserGamificationProfile,
} from './gamificationService'

describe('gamificationService', () => {
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
})
