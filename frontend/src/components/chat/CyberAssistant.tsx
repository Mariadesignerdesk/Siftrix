import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  clearChatHistory,
  createUserMessage,
  DEFAULT_SUGGESTED_QUESTIONS,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  type ChatMessage,
} from '../../services/chatService'
import BrandMark from '../BrandMark'

export default function CyberAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory())
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized, messages, isTyping])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || isTyping) return

    const userMessage = createUserMessage(text)

    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    saveChatHistory(nextHistory)
    setInputText('')
    setIsTyping(true)

    try {
      const assistantMessage = await sendChatMessage(text, nextHistory)
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void handleSend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleClear = () => {
    const fresh = clearChatHistory()
    setMessages(fresh)
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <>
      {/* Floating Trigger Button on Bottom-Right */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen ? (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true)
              setIsMinimized(false)
            }}
            aria-label="Open SIFTRIX AI Cybersecurity Advisor"
            className="group relative flex items-center gap-2.5 rounded-full bg-siftrix-charcoal border border-siftrix-gold px-4 py-3 shadow-[0_12px_32px_rgba(25,25,30,0.45)] hover:scale-105 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-siftrix-champagne opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-siftrix-gold" />
            </span>
            <BrandMark className="h-6 w-6 shrink-0" />
            <span className="text-xs font-bold text-siftrix-white tracking-wide">
              AI Cyber Advisor
            </span>
            <span className="hidden sm:inline-block rounded-full bg-[#1B1B20] px-2 py-0.5 text-[10px] font-semibold text-siftrix-champagne border border-siftrix-gold/40">
              Live
            </span>
          </button>
        ) : null}
      </div>

      {/* Floating Chat Drawer Window */}
      {isOpen ? (
        <div
          role="dialog"
          aria-label="SIFTRIX AI Cyber Advisor"
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[26rem] md:w-[28rem] rounded-2xl border border-siftrix-gold/65 bg-siftrix-pearl shadow-[0_24px_54px_rgba(25,25,30,0.45)] flex flex-col overflow-hidden transition-all duration-300 animate-siftrix-enter ${
            isMinimized ? 'h-16' : 'h-[36rem] max-h-[calc(100dvh-2.5rem)]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-siftrix-charcoal border-b border-siftrix-charcoal-border text-siftrix-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-siftrix-white tracking-tight truncate">
                    SIFTRIX Cyber Advisor
                  </h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-siftrix-champagne truncate">
                  AI Threat Intelligence &amp; Containment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClear}
                title="Clear chat history"
                aria-label="Clear chat history"
                className="p-1.5 rounded-lg text-siftrix-pearl hover:text-red-300 hover:bg-[#1B1B20] transition-colors cursor-pointer text-xs"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand chat' : 'Minimize chat'}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
                className="p-1.5 rounded-lg text-siftrix-pearl hover:text-siftrix-champagne hover:bg-[#1B1B20] transition-colors cursor-pointer"
              >
                {isMinimized ? '▲' : '▼'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
                className="p-1.5 rounded-lg text-siftrix-pearl hover:text-white hover:bg-[#1B1B20] transition-colors cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized ? (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-siftrix-beige/50 text-xs">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isUser ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl p-3.5 space-y-1.5 shadow-2xs leading-relaxed ${
                          isUser
                            ? 'bg-siftrix-charcoal text-siftrix-pearl rounded-tr-xs'
                            : 'bg-white border border-siftrix-border text-siftrix-charcoal rounded-tl-xs'
                        }`}
                      >
                        <div
                          className="whitespace-pre-wrap break-words prose prose-sm max-w-none text-xs leading-relaxed"
                          dir={msg.language === 'ur' ? 'rtl' : 'ltr'}
                        >
                          {msg.content}
                        </div>

                        {msg.citations && msg.citations.length > 0 ? (
                          <div className="pt-2 border-t border-siftrix-border/60 flex flex-wrap gap-1 text-[10px] text-siftrix-muted-dark">
                            <span className="font-semibold text-siftrix-antique-ink">
                              Sources:
                            </span>
                            {msg.citations.map((cite) => (
                              <span
                                key={cite}
                                className="rounded bg-siftrix-pearl px-1.5 py-0.5 border border-siftrix-border"
                              >
                                {cite}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <span className="block text-[9px] text-siftrix-muted-dark text-right pt-0.5">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>

                      {/* Suggested follow-up prompt chips */}
                      {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2 max-w-[92%]">
                          {msg.suggestedFollowUps.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => void handleSend(prompt)}
                              className="text-[11px] font-medium text-siftrix-graphite bg-white hover:bg-siftrix-pearl border border-siftrix-gold/50 rounded-full px-2.5 py-1 text-left transition-colors cursor-pointer shadow-2xs"
                            >
                              💡 {prompt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                {/* Animated Typing Indicator */}
                {isTyping ? (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-siftrix-border text-siftrix-charcoal w-fit rounded-tl-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-medium text-siftrix-muted-dark ml-1">
                      SIFTRIX Advisor is analyzing...
                    </span>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Shelf (if message count is low) */}
              {messages.length <= 2 ? (
                <div className="px-3 py-2 bg-siftrix-pearl border-t border-siftrix-border overflow-x-auto flex gap-1.5 shrink-0 text-xs">
                  {DEFAULT_SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isTyping}
                      onClick={() => void handleSend(q)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-siftrix-border hover:border-siftrix-gold text-[11px] text-siftrix-graphite cursor-pointer transition-colors shrink-0"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSubmit}
                className="p-3 bg-white border-t border-siftrix-border flex items-center gap-2 shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  disabled={isTyping}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about suspicious links, smishing, or SSRF..."
                  className="flex-1 rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2 text-xs sm:text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  aria-label="Send message"
                  className="siftrix-btn-gold px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1"
                >
                  <span>Send</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
