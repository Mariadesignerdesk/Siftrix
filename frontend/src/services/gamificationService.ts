import {
  isValidScanResponse,
  submitScan,
  type ScanRequest,
  type ScanResponse,
  type ScanVerdict,
} from './api'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  getActiveUser,
  syncCrossTabAuthStorageEvent,
  type AuthUser,
} from './authService'
import { addNotification } from './notificationService'
import { SESSION_ID_STORAGE_KEY, loadSessionId } from '../utils/session'

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

export interface GamificationScanScopeSnapshot {
  readonly scopeKey: string
  readonly userId: string | null
  readonly sessionId: string | null
  readonly authEpoch: number
  readonly guestSessionEpoch: number
}

export type ScopedScanExecutionResult =
  | { status: 'stale' }
  | { status: 'request_error'; errorMessage: string }
  | { status: 'invalid_response'; errorMessage: string }
  | {
      status: 'applied'
      scanResult: ScanResponse
      xpAward: {
        amount: number
        profile: UserGamificationProfile
        leveledUp: boolean
      }
    }

/**
 * Legacy shared storage key from v2 when all accounts and guests shared one bucket.
 * Never read as active user state; purged safely when encountered.
 */
export const LEGACY_GAMIFICATION_STORAGE_KEY = 'siftrix_gamification_v2'

const GUEST_FALLBACK_GAMIFICATION_KEY = 'siftrix_gamification_guest'
const GUEST_SESSION_GAMIFICATION_PREFIX = 'siftrix_gamification_sess_'
const USER_GAMIFICATION_PREFIX = 'siftrix_gamification_usr_'
const BADGES_KEY_SUFFIX = ':badges'

const INITIAL_PROFILE: UserGamificationProfile = {
  xp: 1250,
  level: 3,
  levelTitle: 'Senior Threat Hunter',
  currentLevelXp: 250,
  nextLevelXp: 500,
  scansCompleted: 14,
  threatsNeutralized: 9,
  dailyStreak: 4,
  lastActiveDate: '2026-11-28T00:00:00.000Z',
}

const INITIAL_BADGES: AchievementBadge[] = [
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

const LEVEL_TITLES = [
  'Novice Investigator',
  'Junior SOC Analyst',
  'Senior Threat Hunter',
  'Principal Cyber Sentinel',
  'Master Threat Defense Architect',
]

// Scoped in-memory fallback stores so restricted-storage environments never share
// XP, scan counts, streaks, or badges across users or guest sessions.
const memoryProfileStores: Record<string, UserGamificationProfile> = {}
const memoryBadgesStores: Record<string, AchievementBadge[]> = {}
// Records the underlying localStorage raw value at the moment a key fell back to memory:
// - `null` means the key was never persisted in localStorage (pure memory / initial quota fallback).
// - `string` means the key previously had a persisted localStorage value before quota fallback.
const memoryFallbackBaseRaw: Record<string, string | null> = {}
const clearedRawTombstones: Record<string, string> = {}
const unreadableClearedStorages = new WeakMap<object, Set<string>>()
const registeredAuthWindows = new WeakSet<object>()
const registeredStorageWindows = new WeakSet<object>()

let authTransitionEpoch = 0
let guestSessionTransitionEpoch = 0
let lastObservedAuthUserId: string | null = null
let lastObservedGuestSessionKey: string | null = null

function getSafeStorage(): Storage | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null &&
      typeof window.localStorage.getItem === 'function'
    ) {
      return window.localStorage
    }
    if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      globalThis.localStorage !== undefined &&
      globalThis.localStorage !== null &&
      typeof globalThis.localStorage.getItem === 'function'
    ) {
      return globalThis.localStorage
    }
  } catch {
    return null
  }
  return null
}

function safeReadRaw(storage: Storage | null, key: string): string | null {
  if (!storage) {
    return null
  }
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function cloneProfile(profile: UserGamificationProfile): UserGamificationProfile {
  return { ...profile }
}

function cloneBadge(badge: AchievementBadge): AchievementBadge {
  return {
    ...badge,
    progress: badge.progress ? { ...badge.progress } : undefined,
  }
}

function cloneBadges(badges: AchievementBadge[]): AchievementBadge[] {
  return badges.map(cloneBadge)
}

function createDefaultProfile(): UserGamificationProfile {
  return {
    ...INITIAL_PROFILE,
    lastActiveDate: new Date().toISOString(),
  }
}

function createDefaultBadges(): AchievementBadge[] {
  return cloneBadges(INITIAL_BADGES)
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidGamificationProfile(value: unknown): value is UserGamificationProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as Partial<UserGamificationProfile>
  return (
    isFiniteNonNegative(candidate.xp) &&
    typeof candidate.level === 'number' &&
    Number.isFinite(candidate.level) &&
    candidate.level >= 1 &&
    typeof candidate.levelTitle === 'string' &&
    candidate.levelTitle.trim().length > 0 &&
    isFiniteNonNegative(candidate.currentLevelXp) &&
    typeof candidate.nextLevelXp === 'number' &&
    Number.isFinite(candidate.nextLevelXp) &&
    candidate.nextLevelXp > 0 &&
    isFiniteNonNegative(candidate.scansCompleted) &&
    isFiniteNonNegative(candidate.threatsNeutralized) &&
    isFiniteNonNegative(candidate.dailyStreak) &&
    typeof candidate.lastActiveDate === 'string'
  )
}

function isValidAchievementBadge(value: unknown): value is AchievementBadge {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as Partial<AchievementBadge>
  const validCategory =
    candidate.category === 'investigation' ||
    candidate.category === 'defense' ||
    candidate.category === 'streak' ||
    candidate.category === 'mastery'
  const validProgress =
    candidate.progress === undefined ||
    (typeof candidate.progress === 'object' &&
      candidate.progress !== null &&
      isFiniteNonNegative(candidate.progress.current) &&
      isFiniteNonNegative(candidate.progress.max))

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.icon === 'string' &&
    validCategory &&
    typeof candidate.unlocked === 'boolean' &&
    (candidate.unlockedAt === undefined || typeof candidate.unlockedAt === 'string') &&
    isFiniteNonNegative(candidate.xpReward) &&
    validProgress
  )
}

function getBadgesKeyForScope(scopeKey: string): string {
  return `${scopeKey}${BADGES_KEY_SUFFIX}`
}

function clearStorageTombstone(storage: Storage | null, storageKey: string): void {
  delete clearedRawTombstones[storageKey]
  if (storage && typeof storage === 'object') {
    unreadableClearedStorages.get(storage)?.delete(storageKey)
  }
}

function deleteMemoryFallbackForKey(storageKey: string): void {
  delete memoryProfileStores[storageKey]
  delete memoryBadgesStores[storageKey]
  delete memoryFallbackBaseRaw[storageKey]
}

function removeStoredEntryForKey(storageKey: string): void {
  deleteMemoryFallbackForKey(storageKey)

  const storage = getSafeStorage()
  if (!storage) {
    delete clearedRawTombstones[storageKey]
    return
  }

  let removeFailed = false
  try {
    storage.removeItem(storageKey)
  } catch {
    removeFailed = true
  }

  try {
    const remainingRaw = storage.getItem(storageKey)
    if (remainingRaw === null) {
      clearStorageTombstone(storage, storageKey)
    } else {
      clearedRawTombstones[storageKey] = remainingRaw
      unreadableClearedStorages.get(storage)?.delete(storageKey)
    }
  } catch {
    if (removeFailed) {
      let unreadableSet = unreadableClearedStorages.get(storage)
      if (!unreadableSet) {
        unreadableSet = new Set<string>()
        unreadableClearedStorages.set(storage, unreadableSet)
      }
      unreadableSet.add(storageKey)
    }
  }
}

function purgeSessionlessGuestGamification(): void {
  removeStoredEntryForKey(GUEST_FALLBACK_GAMIFICATION_KEY)
  removeStoredEntryForKey(getBadgesKeyForScope(GUEST_FALLBACK_GAMIFICATION_KEY))
}

/**
 * Removes the legacy global `siftrix_gamification_v2` storage entry so historical
 * unscoped progress cannot leak into guest or authenticated sessions.
 */
export function purgeLegacyGamificationStorage(): void {
  deleteMemoryFallbackForKey(LEGACY_GAMIFICATION_STORAGE_KEY)
  const storage = getSafeStorage()
  if (!storage) {
    delete clearedRawTombstones[LEGACY_GAMIFICATION_STORAGE_KEY]
    return
  }

  try {
    if (storage.getItem(LEGACY_GAMIFICATION_STORAGE_KEY) !== null) {
      removeStoredEntryForKey(LEGACY_GAMIFICATION_STORAGE_KEY)
    }
  } catch {
    removeStoredEntryForKey(LEGACY_GAMIFICATION_STORAGE_KEY)
  }
}

function handleAuthStateTransition(): void {
  authTransitionEpoch += 1
  const user = getActiveUser()
  lastObservedAuthUserId = user?.id ?? null
  lastObservedGuestSessionKey = null
  purgeSessionlessGuestGamification()
}

function reconcileMemoryFallbackAfterCrossTabKeyChange(
  storage: Storage,
  key: string,
  event: StorageEvent
): void {
  const currentRaw = safeReadRaw(storage, key)

  if (key in memoryProfileStores || key in memoryBadgesStores) {
    const baseRaw = memoryFallbackBaseRaw[key] ?? null
    const hadPriorPersistedValue =
      baseRaw !== null ||
      Boolean(event && 'oldValue' in event && typeof event.oldValue === 'string')

    if (currentRaw !== baseRaw || (currentRaw === null && hadPriorPersistedValue)) {
      deleteMemoryFallbackForKey(key)
    }
  }

  if (currentRaw === null) {
    clearStorageTombstone(storage, key)
  } else if (clearedRawTombstones[key] !== undefined && clearedRawTombstones[key] !== currentRaw) {
    clearStorageTombstone(storage, key)
  }
}

function handleCrossTabStorageEvent(event: StorageEvent): void {
  const storage = getSafeStorage()
  if (!storage) {
    return
  }

  if (
    event &&
    'storageArea' in event &&
    event.storageArea !== undefined &&
    event.storageArea !== null &&
    event.storageArea !== storage
  ) {
    return
  }

  const hasExplicitKeyProp = Boolean(event && 'key' in event)
  const key = hasExplicitKeyProp ? event.key : undefined
  const isClearEvent = hasExplicitKeyProp && key === null
  const isAuthKey = key === AUTH_STORAGE_KEY || key === AUTH_TOKEN_KEY
  const isSessionIdKey = key === SESSION_ID_STORAGE_KEY
  const isGamificationKey =
    key === GUEST_FALLBACK_GAMIFICATION_KEY ||
    key === getBadgesKeyForScope(GUEST_FALLBACK_GAMIFICATION_KEY) ||
    (typeof key === 'string' &&
      (key.startsWith(GUEST_SESSION_GAMIFICATION_PREFIX) ||
        key.startsWith(USER_GAMIFICATION_PREFIX)))

  if (!isClearEvent && !isAuthKey && !isSessionIdKey && !isGamificationKey) {
    return
  }

  if (isSessionIdKey) {
    guestSessionTransitionEpoch += 1
  }

  if (isAuthKey || isClearEvent) {
    syncCrossTabAuthStorageEvent(event)
  }

  // Reconcile active auth/session identity (increments authTransitionEpoch if user changed)
  getGamificationStorageKey()

  if (isClearEvent) {
    // Only invalidate memory-fallback entries that were backed by a prior persisted
    // localStorage record (`baseRaw !== null`) and are now gone (`currentRaw === null`).
    // Independent memory-only entries (`baseRaw === null`, e.g., sessionStorage user
    // quota fallback) were never in localStorage and must be preserved.
    const cachedKeys = new Set([
      ...Object.keys(memoryProfileStores),
      ...Object.keys(memoryBadgesStores),
    ])
    for (const cachedKey of cachedKeys) {
      const baseRaw = memoryFallbackBaseRaw[cachedKey] ?? null
      if (baseRaw !== null && safeReadRaw(storage, cachedKey) === null) {
        deleteMemoryFallbackForKey(cachedKey)
      }
    }

    for (const tombstoneKey of Object.keys(clearedRawTombstones)) {
      if (safeReadRaw(storage, tombstoneKey) === null) {
        clearStorageTombstone(storage, tombstoneKey)
      }
    }
    return
  }

  if (typeof key === 'string' && isGamificationKey) {
    reconcileMemoryFallbackAfterCrossTabKeyChange(storage, key, event)
  }
}

function ensureAuthListenerAndSyncIdentity(): AuthUser | null {
  try {
    if (
      typeof window !== 'undefined' &&
      window !== null &&
      typeof window.addEventListener === 'function'
    ) {
      if (!registeredAuthWindows.has(window)) {
        registeredAuthWindows.add(window)
        window.addEventListener('siftrix:auth-change', handleAuthStateTransition)
      }
      if (!registeredStorageWindows.has(window)) {
        registeredStorageWindows.add(window)
        window.addEventListener('storage', handleCrossTabStorageEvent)
      }
    }
  } catch {
    // Ignore non-browser environments
  }

  const user = getActiveUser()
  const currentUserId = user?.id ?? null
  if (currentUserId !== lastObservedAuthUserId) {
    authTransitionEpoch += 1
    lastObservedAuthUserId = currentUserId
    lastObservedGuestSessionKey = null
    purgeSessionlessGuestGamification()
  }
  return user
}

ensureAuthListenerAndSyncIdentity()

function readStoredProfileForKey(scopeKey: string): UserGamificationProfile | null {
  const fromMemory = memoryProfileStores[scopeKey]
  if (fromMemory) {
    return cloneProfile(fromMemory)
  }

  const storage = getSafeStorage()
  if (!storage) {
    return null
  }

  if (unreadableClearedStorages.get(storage)?.has(scopeKey)) {
    return null
  }

  try {
    const raw = storage.getItem(scopeKey)
    if (raw === null) {
      delete clearedRawTombstones[scopeKey]
      return null
    }
    if (clearedRawTombstones[scopeKey] === raw) {
      return null
    }
    delete clearedRawTombstones[scopeKey]

    const parsed: unknown = JSON.parse(raw)
    if (isValidGamificationProfile(parsed)) {
      return cloneProfile(parsed)
    }
  } catch {
    // Fallback on storage or JSON parse error
  }

  return null
}

function writeStoredProfileForKey(
  scopeKey: string,
  profile: UserGamificationProfile
): { persistedToStorage: boolean; retainedInMemory: boolean } {
  const cloned = cloneProfile(profile)
  const storage = getSafeStorage()
  const serialized = JSON.stringify(cloned)
  const priorRaw = safeReadRaw(storage, scopeKey)
  let persistedToStorage = false

  if (storage) {
    try {
      storage.setItem(scopeKey, serialized)
      persistedToStorage = storage.getItem(scopeKey) === serialized
    } catch {
      persistedToStorage = false
    }
  }

  if (persistedToStorage) {
    clearStorageTombstone(storage, scopeKey)
    delete memoryProfileStores[scopeKey]
    delete memoryFallbackBaseRaw[scopeKey]
    return { persistedToStorage: true, retainedInMemory: false }
  }

  if (!(scopeKey in memoryFallbackBaseRaw)) {
    memoryFallbackBaseRaw[scopeKey] = priorRaw
  }
  memoryProfileStores[scopeKey] = cloned
  const retainedInMemory = memoryProfileStores[scopeKey] !== undefined
  return { persistedToStorage: false, retainedInMemory }
}

function readStoredBadgesForScope(scopeKey: string): AchievementBadge[] | null {
  const badgesKey = getBadgesKeyForScope(scopeKey)
  const fromMemory = memoryBadgesStores[badgesKey]
  if (fromMemory && fromMemory.length > 0) {
    return cloneBadges(fromMemory)
  }

  const storage = getSafeStorage()
  if (!storage) {
    return null
  }

  if (unreadableClearedStorages.get(storage)?.has(badgesKey)) {
    return null
  }

  try {
    const raw = storage.getItem(badgesKey)
    if (raw === null) {
      delete clearedRawTombstones[badgesKey]
      return null
    }
    if (clearedRawTombstones[badgesKey] === raw) {
      return null
    }
    delete clearedRawTombstones[badgesKey]

    const parsed: unknown = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(isValidAchievementBadge)
    ) {
      return cloneBadges(parsed)
    }
  } catch {
    // Fallback on storage or JSON parse error
  }

  return null
}

function writeStoredBadgesForScope(
  scopeKey: string,
  badges: AchievementBadge[]
): { persistedToStorage: boolean; retainedInMemory: boolean } {
  const badgesKey = getBadgesKeyForScope(scopeKey)
  const cloned = cloneBadges(badges)
  const storage = getSafeStorage()
  const serialized = JSON.stringify(cloned)
  const priorRaw = safeReadRaw(storage, badgesKey)
  let persistedToStorage = false

  if (storage) {
    try {
      storage.setItem(badgesKey, serialized)
      persistedToStorage = storage.getItem(badgesKey) === serialized
    } catch {
      persistedToStorage = false
    }
  }

  if (persistedToStorage) {
    clearStorageTombstone(storage, badgesKey)
    delete memoryBadgesStores[badgesKey]
    delete memoryFallbackBaseRaw[badgesKey]
    return { persistedToStorage: true, retainedInMemory: false }
  }

  if (!(badgesKey in memoryFallbackBaseRaw)) {
    memoryFallbackBaseRaw[badgesKey] = priorRaw
  }
  memoryBadgesStores[badgesKey] = cloned
  const retainedInMemory =
    Array.isArray(memoryBadgesStores[badgesKey]) &&
    memoryBadgesStores[badgesKey].length === cloned.length
  return { persistedToStorage: false, retainedInMemory }
}

function migrateGuestGamificationIfNeeded(sessionScopeKey: string): void {
  if (!sessionScopeKey.startsWith(GUEST_SESSION_GAMIFICATION_PREFIX)) {
    return
  }

  const guestProfile = readStoredProfileForKey(GUEST_FALLBACK_GAMIFICATION_KEY)
  const guestBadges = readStoredBadgesForScope(GUEST_FALLBACK_GAMIFICATION_KEY)
  if (!guestProfile && !guestBadges) {
    return
  }

  const existingSessionProfile = readStoredProfileForKey(sessionScopeKey)
  const existingSessionBadges = readStoredBadgesForScope(sessionScopeKey)
  const destinationHasAnyData =
    existingSessionProfile !== null || existingSessionBadges !== null

  if (destinationHasAnyData) {
    // Atomic rejection: if destination already has either profile or badges,
    // preserve existing destination data untouched and purge sessionless guest data.
    purgeSessionlessGuestGamification()
    return
  }

  let profileRetained = true
  if (guestProfile) {
    const { persistedToStorage, retainedInMemory } = writeStoredProfileForKey(
      sessionScopeKey,
      guestProfile
    )
    profileRetained = persistedToStorage || retainedInMemory
  }

  let badgesRetained = true
  if (profileRetained && guestBadges) {
    const { persistedToStorage, retainedInMemory } = writeStoredBadgesForScope(
      sessionScopeKey,
      guestBadges
    )
    badgesRetained = persistedToStorage || retainedInMemory
  }

  if (!profileRetained || !badgesRetained) {
    removeStoredEntryForKey(sessionScopeKey)
    removeStoredEntryForKey(getBadgesKeyForScope(sessionScopeKey))
    return
  }

  purgeSessionlessGuestGamification()
}

/**
 * Derives the gamification storage key scoped to the active authenticated user or guest session:
 * - Authenticated user: `siftrix_gamification_usr_<userId>`
 * - Guest with X-Session-ID: `siftrix_gamification_sess_<sessionId>` (promoting sessionless guest progress safely)
 * - Uninitialized sessionless guest: `siftrix_gamification_guest`
 */
export function getGamificationStorageKey(): string {
  purgeLegacyGamificationStorage()
  const user = ensureAuthListenerAndSyncIdentity()
  if (user && user.id) {
    lastObservedGuestSessionKey = null
    return `${USER_GAMIFICATION_PREFIX}${user.id}`
  }

  const sessionId = loadSessionId()
  if (sessionId) {
    const sessionScopeKey = `${GUEST_SESSION_GAMIFICATION_PREFIX}${sessionId}`
    if (
      lastObservedGuestSessionKey !== null &&
      lastObservedGuestSessionKey !== sessionScopeKey
    ) {
      guestSessionTransitionEpoch += 1
    }
    migrateGuestGamificationIfNeeded(sessionScopeKey)
    lastObservedGuestSessionKey = sessionScopeKey
    return sessionScopeKey
  }

  if (lastObservedGuestSessionKey !== null) {
    lastObservedGuestSessionKey = null
    guestSessionTransitionEpoch += 1
    purgeSessionlessGuestGamification()
  }

  return GUEST_FALLBACK_GAMIFICATION_KEY
}

/**
 * Captures the initiating user/guest scope and transition epochs when an async scan starts
 * so post-await side effects (`addXp`, `addNotification`) can verify the scope never changed.
 */
export function captureGamificationScanScope(): GamificationScanScopeSnapshot {
  const scopeKey = getGamificationStorageKey()
  const user = getActiveUser()
  const userId = user?.id ?? null
  const sessionId = userId ? null : loadSessionId()

  return {
    scopeKey,
    userId,
    sessionId,
    authEpoch: authTransitionEpoch,
    guestSessionEpoch: guestSessionTransitionEpoch,
  }
}

/**
 * Verifies that no auth or guest-session transition occurred since `snapshot` was captured,
 * while permitting same-tab first-scan promotion from sessionless guest to assigned X-Session-ID.
 */
export function isGamificationScanScopeValid(
  snapshot: GamificationScanScopeSnapshot
): boolean {
  const currentScopeKey = getGamificationStorageKey()
  if (authTransitionEpoch !== snapshot.authEpoch) {
    return false
  }
  if (guestSessionTransitionEpoch !== snapshot.guestSessionEpoch) {
    return false
  }

  const currentUser = getActiveUser()
  const currentUserId = currentUser?.id ?? null

  if (snapshot.userId !== null) {
    return (
      currentUserId === snapshot.userId &&
      currentScopeKey === snapshot.scopeKey
    )
  }

  if (currentUserId !== null) {
    return false
  }

  const currentSessionId = loadSessionId()
  if (snapshot.sessionId !== null) {
    return (
      currentSessionId === snapshot.sessionId &&
      currentScopeKey === snapshot.scopeKey
    )
  }

  if (currentSessionId === null) {
    return currentScopeKey === GUEST_FALLBACK_GAMIFICATION_KEY
  }

  return currentScopeKey === `${GUEST_SESSION_GAMIFICATION_PREFIX}${currentSessionId}`
}

export function getUserGamificationProfile(): UserGamificationProfile {
  const scopeKey = getGamificationStorageKey()
  const stored = readStoredProfileForKey(scopeKey)
  return stored ?? createDefaultProfile()
}

export function saveUserGamificationProfile(profile: UserGamificationProfile): void {
  if (!isValidGamificationProfile(profile)) {
    return
  }
  const scopeKey = getGamificationStorageKey()
  writeStoredProfileForKey(scopeKey, profile)
}

export function addXp(
  amount: number,
  verdict?: ScanVerdict
): { profile: UserGamificationProfile; leveledUp: boolean; xpEarned: number } {
  const safeAmount =
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0
      ? amount
      : 0
  const current = getUserGamificationProfile()
  const newXp = current.xp + safeAmount
  const newScansCount = current.scansCompleted + 1
  const isThreatFlagged = verdict === 'suspicious' || verdict === 'malicious'

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
    threatsNeutralized: isThreatFlagged
      ? current.threatsNeutralized + 1
      : current.threatsNeutralized,
    lastActiveDate: new Date().toISOString(),
  }

  saveUserGamificationProfile(updated)
  return { profile: cloneProfile(updated), leveledUp, xpEarned: safeAmount }
}

/**
 * Executes `submitScan(request)` while capturing the initiating auth/session scope and
 * transition epochs upfront, verifying the scope is still valid after `await submitScan(...)`
 * before recording XP (`addXp`) or creating in-app notifications (`addNotification`).
 */
export async function runScopedScanRequest(
  request: ScanRequest
): Promise<ScopedScanExecutionResult> {
  const initiatingScope = captureGamificationScanScope()
  const response = await submitScan(request)

  if (!isGamificationScanScopeValid(initiatingScope)) {
    return { status: 'stale' }
  }

  if (!response.ok) {
    return {
      status: 'request_error',
      errorMessage:
        response.error ||
        'Scan submission failed. Please ensure the backend server is reachable.',
    }
  }

  if (!isValidScanResponse(response.data)) {
    return {
      status: 'invalid_response',
      errorMessage:
        'Received an incomplete or unexpected response from the backend server.',
    }
  }

  const finalResult = response.data
  const xpAmount = finalResult.verdict === 'malicious' ? 100 : 50
  const xpRes = addXp(xpAmount, finalResult.verdict)

  addNotification({
    title:
      finalResult.verdict === 'malicious'
        ? 'Malicious Threat Isolated'
        : 'Threat Investigation Completed',
    message: `Analyzed ${finalResult.target_type} (${finalResult.verdict.toUpperCase()}). +${xpAmount} XP awarded.`,
    type: finalResult.verdict === 'malicious' ? 'threat' : 'system',
    link: `/scans/${finalResult.id}`,
  })

  return {
    status: 'applied',
    scanResult: finalResult,
    xpAward: {
      amount: xpAmount,
      profile: xpRes.profile,
      leveledUp: xpRes.leveledUp,
    },
  }
}

export function getAchievementBadges(): AchievementBadge[] {
  const scopeKey = getGamificationStorageKey()
  return readStoredBadgesForScope(scopeKey) ?? createDefaultBadges()
}

export function saveAchievementBadges(badges: AchievementBadge[]): void {
  if (!Array.isArray(badges) || badges.length === 0 || !badges.every(isValidAchievementBadge)) {
    return
  }
  const scopeKey = getGamificationStorageKey()
  writeStoredBadgesForScope(scopeKey, badges)
}

export function getLeaderboardRankings(): LeaderboardEntry[] {
  return LEADERBOARD_RANKINGS.map((entry) => ({ ...entry }))
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
