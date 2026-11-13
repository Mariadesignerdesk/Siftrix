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
            aria-label="Open AI Assistant"
            title="Open AI Assistant"
            className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-siftrix-charcoal border border-siftrix-gold text-siftrix-champagne shadow-[0_12px_32px_rgba(25,25,30,0.45)] hover:scale-105 hover:bg-[#202025] hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Floating Chat Drawer Window */}
      {isOpen ? (
        <div
          role="dialog"
          aria-label="SIFTRIX AI Assistant"
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[26rem] md:w-[28rem] rounded-2xl border border-siftrix-gold/65 bg-siftrix-pearl shadow-[0_24px_54px_rgba(25,25,30,0.45)] flex flex-col overflow-hidden transition-all duration-300 animate-siftrix-enter ${
            isMinimized ? 'h-16' : 'h-[36rem] max-h-[calc(100dvh-2.5rem)]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-siftrix-charcoal border-b border-siftrix-charcoal-border text-siftrix-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 text-siftrix-champagne shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <h3 className="text-sm font-bold text-siftrix-white tracking-tight truncate">
                AI Assistant
              </h3>
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
