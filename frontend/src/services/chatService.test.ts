import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as apiClient from './apiClient'
import { loginUser, logoutUser } from './authService'
import {
  clearChatHistory,
  createUserMessage,
  DEFAULT_SUGGESTED_QUESTIONS,
  detectLanguage,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  subscribeChatSessionChange,
  type ChatMessage,
} from './chatService'
import { clearSessionId, saveSessionId } from '../utils/session'

describe('chatService', () => {
  beforeEach(() => {
    logoutUser()
    clearSessionId()
    clearChatHistory()
  })

  it('loads default initial greeting when storage is clean', () => {
    const history = loadChatHistory()
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].role).toBe('assistant')
    expect(history[0].citations).toBeDefined()
  })

  it('creates typed user message with unique ID and language tagging', () => {
    const msg = createUserMessage('Is this link safe?')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Is this link safe?')
    expect(msg.id).toContain('usr_')
    expect(msg.timestamp).toBeDefined()
    expect(msg.language).toBe('en')

    const romanMsg = createUserMessage('Mujhe ek suspicious email mila hai')
    expect(romanMsg.language).toBe('ur-Latn')

    const urduMsg = createUserMessage('کیا یہ لنک محفوظ ہے؟')
    expect(urduMsg.language).toBe('ur')
  })

  it('accurately detects language for Urdu script, Roman Urdu, and English', () => {
    // Urdu script
    expect(detectLanguage('کیا یہ لنک محفوظ ہے؟')).toBe('ur')
    expect(detectLanguage('سائبر سیکیورٹی رہنمائی')).toBe('ur')

    // Roman Urdu
    expect(
      detectLanguage('Mujhe ek suspicious email mila hai. Kaise check karun ke phishing hai?')
    ).toBe('ur-Latn')
    expect(detectLanguage('Kya ye link safe hai?')).toBe('ur-Latn')
    expect(detectLanguage('Agar link click ho jaye to kya karein?')).toBe('ur-Latn')
    expect(detectLanguage('Mujhe lagta hai ye fraud message hai')).toBe('ur-Latn')

    // English
    expect(detectLanguage('How do I identify a phishing link before clicking?')).toBe('en')
    expect(detectLanguage('What is SSRF and why is it dangerous?')).toBe('en')
    expect(detectLanguage('What should I do if I clicked a suspicious link?')).toBe('en')
  })

  it('persists and clears chat messages safely', () => {
    const custom: ChatMessage[] = [
      {
        id: 'test-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      },
    ]
    saveChatHistory(custom)
    expect(loadChatHistory()).toEqual(custom)

    clearChatHistory()
    const resetHistory = loadChatHistory()
    expect(resetHistory[0].id).toBe('msg_welcome')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('responds with phishing containment protocol when clicked is mentioned in English', async () => {
    // Mock network failure to verify deterministic offline breach containment template
    vi.spyOn(apiClient, 'apiPost').mockRejectedValueOnce(new Error('Backend offline'))
    const history = loadChatHistory()
    const response = await sendChatMessage('I accidentally clicked a suspicious link!', history)
    expect(response.role).toBe('assistant')
    expect(response.content).toContain('Breach Containment Protocol')
    expect(response.language).toBe('en')
    expect(response.citations?.length).toBeGreaterThan(0)
  })

  it('provides Roman Urdu response when user asks in Roman Urdu', async () => {
    // When backend returns mismatched English, frontend enforces Roman Urdu fallback
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'msg_en_mismatch',
        role: 'assistant',
        content: 'This is an English response to a Roman Urdu query.',
        timestamp: new Date().toISOString(),
        language: 'en',
      },
      error: null,
      status: 200,
    })
    const history = loadChatHistory()
    const query = 'Mujhe ek suspicious email mila hai. Kaise check karun ke phishing hai?'
    const response = await sendChatMessage(query, history)

    expect(response.role).toBe('assistant')
    expect(response.language).toBe('ur-Latn')
    expect(response.content).toContain('Phishing Email')
    expect(response.content).toContain('Check Karne Ka Tareeqa')
    expect(response.content).toContain('Sender Ka Asal Email Address')
    expect(response.citations).toContain('MITRE ATT&CK T1566: Phishing')
    expect(response.suggestedFollowUps?.length).toBeGreaterThan(0)
  })

  it('accepts real backend response when backend honors Roman Urdu language', async () => {
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'msg_backend_test',
        role: 'assistant',
        content: 'Yeh email phishing lag raha hai. Kabhi bhi apna OTP kisi se share na karein.',
        timestamp: new Date().toISOString(),
        citations: ['SIFTRIX Roman Urdu Threat Intel'],
        suggestedFollowUps: ['Kya OTP safe hai?'],
        language: 'ur-Latn',
      },
      error: null,
      status: 200,
    })

    const history = loadChatHistory()
    const response = await sendChatMessage('Mujhe ek suspicious email mila hai', history)
    expect(response.id).toBe('msg_backend_test')
    expect(response.language).toBe('ur-Latn')
    expect(response.content).toContain('Yeh email phishing lag raha hai')
  })

  it('provides Urdu script response when Urdu script text is detected', async () => {
    vi.spyOn(apiClient, 'apiPost').mockRejectedValueOnce(new Error('Offline'))
    const history = loadChatHistory()
    const response = await sendChatMessage('کیا یہ لنک محفوظ ہے؟', history)
    expect(response.role).toBe('assistant')
    expect(response.language).toBe('ur')
    expect(response.content).toContain('سائبر سیکیورٹی مشیر')
    expect(response.citations).toContain('SIFTRIX اردو سیکیورٹی گائیڈ')
  })

  it('accepts real backend response when backend honors Urdu script language', async () => {
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'msg_urdu_test',
        role: 'assistant',
        content: 'یہ لنک مشکوک معلوم ہوتا ہے۔ براہ کرم محتاط رہیں۔',
        timestamp: new Date().toISOString(),
        citations: ['SIFTRIX اردو انٹیلی جنس'],
        suggestedFollowUps: ['کیا یہ محفوظ ہے؟'],
        language: 'ur',
      },
      error: null,
      status: 200,
    })

    const history = loadChatHistory()
    const response = await sendChatMessage('کیا یہ محفوظ ہے؟', history)
    expect(response.id).toBe('msg_urdu_test')
    expect(response.language).toBe('ur')
    expect(response.content).toContain('یہ لنک مشکوک معلوم ہوتا ہے')
  })

  it('has default suggested cybersecurity questions including Roman Urdu', () => {
    expect(DEFAULT_SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(4)
    expect(DEFAULT_SUGGESTED_QUESTIONS.some((q) => q.includes('Mujhe'))).toBe(true)
  })

  it('provides verified 27.7% statistic and standard markdown source link for APWG report in Roman Urdu', async () => {
    vi.spyOn(apiClient, 'apiPost').mockRejectedValueOnce(new Error('Backend offline'))
    const history = loadChatHistory()
    const query = 'APWG Q4 2022 report ke mutabiq financial sector phishing share kitna hai?'
    const response = await sendChatMessage(query, history)

    expect(response.role).toBe('assistant')
    expect(response.language).toBe('ur-Latn')
    expect(response.content).toContain('27.7%')
    expect(response.content).not.toContain('30%')
    expect(response.content).not.toContain('30.5%')
    expect(response.content).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
    expect(response.content).not.toContain('<a href=')
    expect(response.content).not.toContain('\\<a href=')
    expect(response.citations).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
  })

  it('provides verified 27.7% statistic and standard markdown source link for APWG report in English', async () => {
    vi.spyOn(apiClient, 'apiPost').mockRejectedValueOnce(new Error('Backend offline'))
    const history = loadChatHistory()
    const query = 'What was the financial sector phishing share in the APWG Q4 2022 report?'
    const response = await sendChatMessage(query, history)

    expect(response.role).toBe('assistant')
    expect(response.language).toBe('en')
    expect(response.content).toContain('27.7%')
    expect(response.content).not.toContain('30%')
    expect(response.content).not.toContain('30.5%')
    expect(response.content).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
    expect(response.content).not.toContain('<a href=')
    expect(response.content).not.toContain('\\<a href=')
    expect(response.citations).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
  })

  it('provides verified 27.7% statistic and markdown source link for APWG report in Urdu script', async () => {
    vi.spyOn(apiClient, 'apiPost').mockRejectedValueOnce(new Error('Backend offline'))
    const history = loadChatHistory()
    const query = 'APWG کی Q4 2022 رپورٹ کے مطابق مالیاتی شعبے کا فشنگ شیئر کیا تھا؟'
    const response = await sendChatMessage(query, history)

    expect(response.role).toBe('assistant')
    expect(response.language).toBe('ur')
    expect(response.content).toContain('27.7%')
    expect(response.content).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
    expect(response.citations).toContain(
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
  })

  it('isolates chat history across accounts and guest sessions, clears UI on signout, and restores same user history on re-login', async () => {
    const sessionEvents: number[] = []
    const unsubscribe = subscribeChatSessionChange(() => {
      sessionEvents.push(loadChatHistory().length)
    })

    // 1. User A logs in and sends a message
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      status: 200,
      error: null,
      data: {
        access_token: 'token_user_a',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          email: 'usera@siftrix.internal',
          full_name: 'User A',
          is_active: true,
          created_at: '2026-11-15T10:00:00Z',
        },
      },
    })
    await loginUser({ email: 'usera@siftrix.internal', password: 'Password123!' })

    const userAMessages: ChatMessage[] = [
      ...loadChatHistory(),
      createUserMessage('User A secret phishing question'),
    ]
    saveChatHistory(userAMessages)
    expect(loadChatHistory()).toHaveLength(2)
    expect(loadChatHistory()[1].content).toBe('User A secret phishing question')

    // 2. User A signs out -> chat history is immediately cleared from active/guest state
    logoutUser()
    const afterSignoutHistory = loadChatHistory()
    expect(afterSignoutHistory).toHaveLength(1)
    expect(afterSignoutHistory[0].id).toBe('msg_welcome')
    expect(sessionEvents.length).toBeGreaterThanOrEqual(2)

    // 3. Guest session does not see User A's messages
    saveSessionId('99999999-9999-4999-8999-999999999999')
    expect(loadChatHistory()).toHaveLength(1)
    expect(loadChatHistory()[0].id).toBe('msg_welcome')
    const guestMessages: ChatMessage[] = [
      ...loadChatHistory(),
      createUserMessage('Guest session question'),
    ]
    saveChatHistory(guestMessages)
    expect(loadChatHistory()).toHaveLength(2)

    // 4. User B logs in -> only sees User B's clean history, neither User A's nor Guest's
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      status: 200,
      error: null,
      data: {
        access_token: 'token_user_b',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 'bbbbbbbb-2222-4222-8222-222222222222',
          email: 'userb@siftrix.internal',
          full_name: 'User B',
          is_active: true,
          created_at: '2026-11-15T10:05:00Z',
        },
      },
    })
    await loginUser({ email: 'userb@siftrix.internal', password: 'Password123!' })
    expect(loadChatHistory()).toHaveLength(1)
    expect(loadChatHistory()[0].id).toBe('msg_welcome')

    const userBMessages: ChatMessage[] = [
      ...loadChatHistory(),
      createUserMessage('User B distinct question'),
    ]
    saveChatHistory(userBMessages)
    expect(loadChatHistory()[1].content).toBe('User B distinct question')

    // 5. User B signs out and User A logs back in -> User A retrieves User A's own history
    logoutUser()
    expect(loadChatHistory()).toHaveLength(1)

    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      status: 200,
      error: null,
      data: {
        access_token: 'token_user_a_relogin',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          email: 'usera@siftrix.internal',
          full_name: 'User A',
          is_active: true,
          created_at: '2026-11-15T10:00:00Z',
        },
      },
    })
    await loginUser({ email: 'usera@siftrix.internal', password: 'Password123!' })
    const restoredUserAHistory = loadChatHistory()
    expect(restoredUserAHistory).toHaveLength(2)
    expect(restoredUserAHistory[1].content).toBe('User A secret phishing question')

    unsubscribe()
  })
})
