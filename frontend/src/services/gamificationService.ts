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

const GAMIFICATION_STORAGE_KEY = 'siftrix_gamification_v2'

const INITIAL_PROFILE: UserGamificationProfile = {
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

const INITIAL_BADGES: AchievementBadge[] = [
  {
    id: 'badge_first_scan',
    title: 'First Recon Probe',
    description: 'Completed your first automated threat scan on SIFTRIX.',
    icon: '🎯',
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
    icon: '🎣',
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
    icon: '🌐',
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
    icon: '🔥',
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
    icon: '🛡️',
    category: 'defense',
    unlocked: false,
    xpReward: 400,
    progress: { current: 2, max: 3 },
  },
  {
    id: 'badge_ssrf_detector',
    title: 'Perimeter Bastion',
    description: 'Detected and deflected a Server-Side Request Forgery attempt.',
    icon: '⚡',
    category: 'mastery',
    unlocked: false,
    xpReward: 500,
    progress: { current: 0, max: 1 },
  },
  {
    id: 'badge_scan_century',
    title: 'Centurion Auditor',
    description: 'Analyze 100 enterprise URLs, SMS alerts, and email payloads.',
    icon: '🎖️',
    category: 'investigation',
    unlocked: false,
    xpReward: 750,
    progress: { current: 14, max: 100 },
  },
  {
    id: 'badge_streak_7',
    title: 'Unbroken Aegis',
    description: 'Complete 7 consecutive days of active cybersecurity patrols.',
    icon: '👑',
    category: 'streak',
    unlocked: false,
    xpReward: 1000,
    progress: { current: 4, max: 7 },
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

let memoryProfile: UserGamificationProfile | null = null
const memoryBadges: AchievementBadge[] | null = null

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

export function getUserGamificationProfile(): UserGamificationProfile {
  const storage = getSafeStorage()
  if (storage) {
    try {
      const raw = storage.getItem(GAMIFICATION_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as UserGamificationProfile
      }
    } catch {
      // fallback
    }
  }
  return memoryProfile || INITIAL_PROFILE
}

export function saveUserGamificationProfile(profile: UserGamificationProfile): void {
  memoryProfile = profile
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // ignore
    }
  }
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

export function getAchievementBadges(): AchievementBadge[] {
  return memoryBadges || INITIAL_BADGES
}

export function getLeaderboardRankings(): LeaderboardEntry[] {
  return LEADERBOARD_RANKINGS
}

export function getDailyStreakCalendar(): {
  dayName: string
  dayNumber: number
  active: boolean
  isToday: boolean
}[] {
  return [
    { dayName: 'Mon', dayNumber: 10, active: true, isToday: false },
    { dayName: 'Tue', dayNumber: 11, active: true, isToday: false },
    { dayName: 'Wed', dayNumber: 12, active: true, isToday: false },
    { dayName: 'Thu', dayNumber: 13, active: true, isToday: true },
    { dayName: 'Fri', dayNumber: 14, active: false, isToday: false },
    { dayName: 'Sat', dayNumber: 15, active: false, isToday: false },
    { dayName: 'Sun', dayNumber: 16, active: false, isToday: false },
  ]
}
