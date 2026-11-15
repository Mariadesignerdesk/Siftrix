import { loadSessionId } from '../utils/session'

export interface AchievementBadge {
  id: string
  title: string
  description: string
  icon: string
  category: 'investigation' | 'defense' | 'streak' | 'mastery'
  unlocked: boolean
  unlockedAt?: string
  xpReward: number
  progress?: { current: number; max: number }
}

export interface UserGamificationProfile {
  xp: number
  level: number
  levelTitle: string
  currentLevelXp: number
  nextLevelXp: number
  scansCompleted: number
  threatsNeutralized: number
  dailyStreak: number
  lastActiveDate: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  handle: string
  title: string
  xp: number
  scansCount: number
  accuracyRate: string
  tier: 'Gold Sentinel' | 'Silver Warden' | 'Bronze Guardian' | 'Field Analyst'
  isCurrentUser?: boolean
}

export const GAMIFICATION_STORAGE_KEY = 'siftrix_gamification_v2'
const AUTH_USER_STORAGE_KEY = 'siftrix_auth_user_v2'

let activeGamificationUserId: string | null = null
const gamificationChangeListeners = new Set<() => void>()

export function setActiveGamificationUserId(userId: string | null): void {
  activeGamificationUserId = userId ? userId.trim() : null
}

export function subscribeGamificationChange(listener: () => void): () => void {
  gamificationChangeListeners.add(listener)
  return () => {
    gamificationChangeListeners.delete(listener)
  }
}

export function notifyGamificationChange(): void {
  for (const listener of gamificationChangeListeners) {
    try {
      listener()
    } catch {
      // Ignore listener errors
    }
  }
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    // fallback
  }
  return null
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage
    }
  } catch {
    // fallback
  }
  return null
}

function resolveActiveUserId(): string | null {
  if (activeGamificationUserId) {
    return activeGamificationUserId
  }
  try {
    const local = getSafeStorage()
    const session = getSafeSessionStorage()
    const raw =
      local?.getItem(AUTH_USER_STORAGE_KEY) ||
      session?.getItem(AUTH_USER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; email?: string }
      const id = parsed?.id?.trim() || parsed?.email?.trim()?.toLowerCase()
      if (id) return id
    }
  } catch {
    // Ignore storage read errors
  }
  return null
}

export function getGamificationStorageKey(): string {
  const userId = resolveActiveUserId()
  if (userId) {
    return `${GAMIFICATION_STORAGE_KEY}:user:${userId}`
  }
  const guestSessionId = loadSessionId()
  if (guestSessionId) {
    return `${GAMIFICATION_STORAGE_KEY}:guest:${guestSessionId}`
  }
  return `${GAMIFICATION_STORAGE_KEY}:guest:default`
}

export const INITIAL_PROFILE: UserGamificationProfile = {
  xp: 1250,
  level: 3,
  levelTitle: 'Senior Threat Hunter',
  currentLevelXp: 250,
  nextLevelXp: 500,
  scansCompleted: 14,
  threatsNeutralized: 9,
  dailyStreak: 4,
  lastActiveDate: new Date().toISOString(),
}

export function createInitialProfile(): UserGamificationProfile {
  return {
    ...INITIAL_PROFILE,
    lastActiveDate: new Date().toISOString(),
  }
}

export const INITIAL_BADGES: AchievementBadge[] = [
  {
    id: 'badge_first_scan',
    title: 'First Recon Probe',
    description: 'Completed your first automated threat scan on SIFTRIX.',
    icon: 'target',
    category: 'investigation',
    unlocked: true,
    unlockedAt: '2 days ago',
    xpReward: 100,
    progress: { current: 1, max: 1 },
  },
  {
    id: 'badge_phish_catcher',
    title: 'Phishing Interceptor',
    description: 'Intercepted and isolated a credential-harvesting phishing domain.',
    icon: 'phish',
    category: 'defense',
    unlocked: true,
    unlockedAt: '1 day ago',
    xpReward: 250,
    progress: { current: 5, max: 5 },
  },
  {
    id: 'badge_urdu_guardian',
    title: 'Bilingual Sentinel',
    description: 'Reviewed Urdu localized threat advisories and safety advisories.',
    icon: 'globe',
    category: 'mastery',
    unlocked: true,
    unlockedAt: 'Yesterday',
    xpReward: 200,
    progress: { current: 3, max: 3 },
  },
  {
    id: 'badge_streak_3',
    title: 'Relentless Watch',
    description: 'Maintained a 3-day consecutive threat investigation streak.',
    icon: 'flame',
    category: 'streak',
    unlocked: true,
    unlockedAt: 'Today',
    xpReward: 300,
    progress: { current: 3, max: 3 },
  },
  {
    id: 'badge_bec_neutralizer',
    title: 'Executive Shield',
    description: 'Neutralized an impersonated Business Email Compromise (BEC) attack.',
    icon: 'shield',
    category: 'defense',
    unlocked: false,
    xpReward: 400,
    progress: { current: 2, max: 3 },
  },
  {
    id: 'badge_ssrf_detector',
    title: 'Perimeter Bastion',
    description: 'Detected and deflected a Server-Side Request Forgery attempt.',
    icon: 'zap',
    category: 'mastery',
    unlocked: false,
    xpReward: 500,
    progress: { current: 0, max: 1 },
  },
  {
    id: 'badge_scan_century',
    title: 'Centurion Auditor',
    description: 'Analyze 100 enterprise URLs, SMS alerts, and email payloads.',
    icon: 'award',
    category: 'investigation',
    unlocked: false,
    xpReward: 750,
    progress: { current: 14, max: 100 },
  },
  {
    id: 'badge_streak_7',
    title: 'Unbroken Aegis',
    description: 'Complete 7 consecutive days of active cybersecurity patrols.',
    icon: 'crown',
    category: 'streak',
    unlocked: false,
    xpReward: 1000,
    progress: { current: 4, max: 7 },
  },
]

export const DEMO_PEER_RANKINGS: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  {
    name: 'Tariq Al-Mansoor',
    handle: '@tariq.sentinel',
    title: 'Principal Cyber Warfare Architect',
    xp: 4850,
    scansCount: 142,
    accuracyRate: '99.4%',
    tier: 'Gold Sentinel',
  },
  {
    name: 'Elena Rostova',
    handle: '@rostova_defense',
    title: 'Lead Incident Response Operative',
    xp: 3920,
    scansCount: 98,
    accuracyRate: '98.8%',
    tier: 'Gold Sentinel',
  },
  {
    name: 'Marcus Vance',
    handle: '@vance_sec',
    title: 'Senior Forensics Analyst',
    xp: 3100,
    scansCount: 84,
    accuracyRate: '97.5%',
    tier: 'Silver Warden',
  },
  {
    name: 'Dr. Aisha Malik',
    handle: '@aisha_ml_threat',
    title: 'AI Threat Modeler',
    xp: 1180,
    scansCount: 22,
    accuracyRate: '95.9%',
    tier: 'Bronze Guardian',
  },
  {
    name: 'Devon Reed',
    handle: '@d_reed_soc',
    title: 'SOC Tier 2 Investigator',
    xp: 940,
    scansCount: 19,
    accuracyRate: '94.0%',
    tier: 'Bronze Guardian',
  },
  {
    name: 'Sofia Chen',
    handle: '@sofia_cloudsec',
    title: 'Cloud Infrastructure Guard',
    xp: 820,
    scansCount: 15,
    accuracyRate: '93.5%',
    tier: 'Field Analyst',
  },
  {
    name: 'Kareem Bennett',
    handle: '@kareem_sec',
    title: 'AppSec Penetration Tester',
    xp: 680,
    scansCount: 12,
    accuracyRate: '91.8%',
    tier: 'Field Analyst',
  },
]

export const LEADERBOARD_RANKINGS: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Tariq Al-Mansoor',
    handle: '@tariq.sentinel',
    title: 'Principal Cyber Warfare Architect',
    xp: 4850,
    scansCount: 142,
    accuracyRate: '99.4%',
    tier: 'Gold Sentinel',
  },
  {
    rank: 2,
    name: 'Elena Rostova',
    handle: '@rostova_defense',
    title: 'Lead Incident Response Operative',
    xp: 3920,
    scansCount: 98,
    accuracyRate: '98.8%',
    tier: 'Gold Sentinel',
  },
  {
    rank: 3,
    name: 'Marcus Vance',
    handle: '@vance_sec',
    title: 'Senior Forensics Analyst',
    xp: 3100,
    scansCount: 84,
    accuracyRate: '97.5%',
    tier: 'Silver Warden',
  },
  {
    rank: 4,
    name: 'You (Security Lead)',
    handle: '@analyst_you',
    title: 'Senior Threat Hunter',
    xp: 1250,
    scansCount: 14,
    accuracyRate: '96.2%',
    tier: 'Silver Warden',
    isCurrentUser: true,
  },
  {
    rank: 5,
    name: 'Dr. Aisha Malik',
    handle: '@aisha_ml_threat',
    title: 'AI Threat Modeler',
    xp: 1180,
    scansCount: 22,
    accuracyRate: '95.9%',
    tier: 'Bronze Guardian',
  },
  {
    rank: 6,
    name: 'Devon Reed',
    handle: '@d_reed_soc',
    title: 'SOC Tier 2 Investigator',
    xp: 940,
    scansCount: 19,
    accuracyRate: '94.0%',
    tier: 'Bronze Guardian',
  },
  {
    rank: 7,
    name: 'Sofia Chen',
    handle: '@sofia_cloudsec',
    title: 'Cloud Infrastructure Guard',
    xp: 820,
    scansCount: 15,
    accuracyRate: '93.5%',
    tier: 'Field Analyst',
  },
  {
    rank: 8,
    name: 'Kareem Bennett',
    handle: '@kareem_sec',
    title: 'AppSec Penetration Tester',
    xp: 680,
    scansCount: 12,
    accuracyRate: '91.8%',
    tier: 'Field Analyst',
  },
]

const memoryProfilesByScope = new Map<string, UserGamificationProfile>()
const memoryBadgesByScope = new Map<string, AchievementBadge[]>()

export function getUserGamificationProfile(): UserGamificationProfile {
  const key = getGamificationStorageKey()
  const storage = getSafeStorage()
  if (storage) {
    try {
      const raw = storage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as UserGamificationProfile
        memoryProfilesByScope.set(key, parsed)
        return parsed
      }
    } catch {
      // fallback
    }
  }
  const fromMem = memoryProfilesByScope.get(key)
  if (fromMem) {
    return fromMem
  }
  const initial = createInitialProfile()
  return initial
}

export function saveUserGamificationProfile(profile: UserGamificationProfile): void {
  const key = getGamificationStorageKey()
  memoryProfilesByScope.set(key, profile)
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(profile))
    } catch {
      // ignore
    }
  }
  notifyGamificationChange()
}

export function resetGamificationStateOnSignOut(): void {
  activeGamificationUserId = null
  memoryProfilesByScope.delete(`${GAMIFICATION_STORAGE_KEY}:guest:default`)
  for (const key of Array.from(memoryProfilesByScope.keys())) {
    if (key.includes(':guest:')) {
      memoryProfilesByScope.delete(key)
    }
  }
  memoryBadgesByScope.clear()
  notifyGamificationChange()
}

const LEVEL_TITLES = [
  'Novice Investigator',
  'Junior SOC Analyst',
  'Senior Threat Hunter',
  'Principal Cyber Sentinel',
  'Master Threat Defense Architect',
]

export function addXp(
  amount: number
): { profile: UserGamificationProfile; leveledUp: boolean; xpEarned: number } {
  const current = getUserGamificationProfile()
  const newXp = current.xp + amount
  const newScansCount = current.scansCompleted + 1

  // 500 XP per level
  const newLevel = Math.floor(newXp / 500) + 1
  const leveledUp = newLevel > current.level
  const currentLevelXp = newXp % 500
  const title = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)]

  const updated: UserGamificationProfile = {
    ...current,
    xp: newXp,
    level: newLevel,
    levelTitle: title,
    currentLevelXp,
    nextLevelXp: 500,
    scansCompleted: newScansCount,
    threatsNeutralized: current.threatsNeutralized + 1,
    lastActiveDate: new Date().toISOString(),
  }

  saveUserGamificationProfile(updated)
  return { profile: updated, leveledUp, xpEarned: amount }
}

export function syncScansCompleted(count: number): UserGamificationProfile {
  const current = getUserGamificationProfile()
  if (current.scansCompleted === count) {
    return current
  }
  const updated: UserGamificationProfile = {
    ...current,
    scansCompleted: count,
  }
  saveUserGamificationProfile(updated)
  return updated
}

export function getTierForXp(xp: number): LeaderboardEntry['tier'] {
  if (xp >= 3500) return 'Gold Sentinel'
  if (xp >= 1250) return 'Silver Warden'
  if (xp >= 800) return 'Bronze Guardian'
  return 'Field Analyst'
}

export function calculateLeaderboardRankings(
  customProfile?: UserGamificationProfile,
  actualScansCount?: number
): LeaderboardEntry[] {
  const profile = customProfile || getUserGamificationProfile()
  const scansCount =
    typeof actualScansCount === 'number' ? actualScansCount : profile.scansCompleted
  const tier = getTierForXp(profile.xp)

  const currentUserEntry: LeaderboardEntry = {
    rank: 1,
    name: 'You (Security Lead)',
    handle: '@analyst_you',
    title: profile.levelTitle || 'Senior Threat Hunter',
    xp: profile.xp,
    scansCount,
    accuracyRate: '96.2%',
    tier,
    isCurrentUser: true,
  }

  const allEntries: LeaderboardEntry[] = [
    ...DEMO_PEER_RANKINGS.map((e) => ({ ...e, isCurrentUser: false, rank: 0 })),
    currentUserEntry,
  ]

  allEntries.sort((a, b) => {
    if (b.xp !== a.xp) {
      return b.xp - a.xp
    }
    if (a.isCurrentUser) return -1
    if (b.isCurrentUser) return 1
    return 0
  })

  return allEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }))
}

export function getLeaderboardRankings(
  customProfile?: UserGamificationProfile,
  actualScansCount?: number
): LeaderboardEntry[] {
  return calculateLeaderboardRankings(customProfile, actualScansCount)
}

export function getCurrentUserRank(
  xp?: number,
  profile?: UserGamificationProfile
): number {
  const currentProfile = profile || getUserGamificationProfile()
  const targetXp = typeof xp === 'number' ? xp : currentProfile.xp
  const rankings = calculateLeaderboardRankings({ ...currentProfile, xp: targetXp })
  const found = rankings.find((r) => r.isCurrentUser)
  return found ? found.rank : 4
}

export function getAchievementBadges(profile?: UserGamificationProfile): AchievementBadge[] {
  const currentProfile = profile || getUserGamificationProfile()
  const key = `${getGamificationStorageKey()}:badges`
  let badges: AchievementBadge[] | null = null
  const storage = getSafeStorage()
  if (storage) {
    try {
      const raw = storage.getItem(key)
      if (raw) {
        badges = JSON.parse(raw) as AchievementBadge[]
      }
    } catch {
      // ignore
    }
  }
  if (!badges) {
    badges = memoryBadgesByScope.get(key) || INITIAL_BADGES
  }

  return badges.map((badge) => {
    if (badge.id === 'badge_first_scan') {
      const unlocked = currentProfile.scansCompleted >= 1
      return {
        ...badge,
        unlocked,
        progress: { current: Math.min(currentProfile.scansCompleted, 1), max: 1 },
      }
    }
    if (badge.id === 'badge_scan_century') {
      const unlocked = currentProfile.scansCompleted >= 100
      return {
        ...badge,
        unlocked,
        progress: { current: Math.min(currentProfile.scansCompleted, 100), max: 100 },
      }
    }
    if (badge.id === 'badge_streak_3') {
      const unlocked = currentProfile.dailyStreak >= 3
      return {
        ...badge,
        unlocked,
        progress: { current: Math.min(currentProfile.dailyStreak, 3), max: 3 },
      }
    }
    if (badge.id === 'badge_streak_7') {
      const unlocked = currentProfile.dailyStreak >= 7
      return {
        ...badge,
        unlocked,
        progress: { current: Math.min(currentProfile.dailyStreak, 7), max: 7 },
      }
    }
    return badge
  })
}

export function saveAchievementBadges(badges: AchievementBadge[]): void {
  const key = `${getGamificationStorageKey()}:badges`
  memoryBadgesByScope.set(key, badges)
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(badges))
    } catch {
      // ignore
    }
  }
  notifyGamificationChange()
}

export function getDailyStreakCalendar(
  profile?: UserGamificationProfile,
  referenceDate?: Date
): {
  dayName: string
  dayNumber: number
  active: boolean
  isToday: boolean
}[] {
  const currentProfile = profile || getUserGamificationProfile()
  const streak = currentProfile.dailyStreak || 1
  const today = referenceDate ? new Date(referenceDate) : new Date()

  // In JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert to Monday-first index: 0 = Mon, 1 = Tue, ..., 6 = Sun
  const dayOfWeek = today.getDay()
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return weekdayNames.map((dayName, index) => {
    const diff = index - todayIndex
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
    const isToday = index === todayIndex
    const daysBeforeToday = todayIndex - index
    const active = index <= todayIndex && streak >= daysBeforeToday + 1

    return {
      dayName,
      dayNumber: d.getDate(),
      active,
      isToday,
    }
  })
}
