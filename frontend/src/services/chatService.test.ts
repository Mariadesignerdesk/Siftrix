import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearChatHistory,
  createUserMessage,
  DEFAULT_SUGGESTED_QUESTIONS,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  type ChatMessage,
} from './chatService'

describe('chatService', () => {
  beforeEach(() => {
    clearChatHistory()
  })

  it('loads default initial greeting when storage is clean', () => {
    const history = loadChatHistory()
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].role).toBe('assistant')
    expect(history[0].citations).toBeDefined()
  })

  it('creates typed user message with unique ID', () => {
    const msg = createUserMessage('Is this link safe?')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Is this link safe?')
    expect(msg.id).toContain('usr_')
    expect(msg.timestamp).toBeDefined()
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

  it('responds with phishing containment protocol when clicked is mentioned', async () => {
    const history = loadChatHistory()
    const response = await sendChatMessage('I accidentally clicked a suspicious link!', history)
    expect(response.role).toBe('assistant')
    expect(response.content).toContain('Breach Containment Protocol')
    expect(response.citations?.length).toBeGreaterThan(0)
  })

  it('provides Urdu responses when Urdu text or query is detected', async () => {
    const history = loadChatHistory()
    const response = await sendChatMessage('کیا یہ لنک محفوظ ہے؟', history)
    expect(response.role).toBe('assistant')
    expect(response.content).toContain('سائبر سیکیورٹی مشیر')
    expect(response.citations).toContain('SIFTRIX اردو سیکیورٹی گائیڈ')
  })

  it('has default suggested cybersecurity questions', () => {
    expect(DEFAULT_SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(4)
  })
})
