import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import BrandMark from '../components/BrandMark'
import {
  clearChatHistory,
  createUserMessage,
  DEFAULT_SUGGESTED_QUESTIONS,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  type ChatMessage,
} from '../services/chatService'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'

interface AssistantPageProps {
  onNavigate: NavigateFn
}

export default function AssistantPage({ onNavigate }: AssistantPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory())
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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
    <section
      aria-label="SIFTRIX AI Cyber Advisor Assistant"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 animate-siftrix-enter"
    >
      {/* Top Header Card */}
      <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
        />

        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/50 bg-[#1D1D22] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
            Interactive Cyber Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-siftrix-white tracking-tight">
            AI Cybersecurity Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#C8C1B6] max-w-xl">
            Ask specialized questions regarding phishing URLs, smishing lures, SSRF mitigation, and immediate incident containment protocols.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl siftrix-btn-charcoal-outline text-xs font-semibold cursor-pointer"
          >
            Clear History
          </button>
          <a
            href="/"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/', 'scan')}
            className="siftrix-btn-gold px-4 py-2 rounded-xl text-xs font-semibold"
          >
            Threat Scanner →
          </a>
        </div>
      </div>

      {/* Main Chat Interface Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Prompts & Guidance */}
        <aside className="min-w-0 lg:col-span-4 space-y-4">
          <div className="siftrix-card p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <BrandMark className="h-6 w-6 shrink-0" />
              <h2 className="text-sm font-bold text-siftrix-charcoal">
                Suggested Security Prompts
              </h2>
            </div>
            <p className="text-xs text-siftrix-muted-dark leading-relaxed">
              Click any question below to test AI reasoning and instant containment advice:
            </p>

            <div className="space-y-2 pt-1">
              {DEFAULT_SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isTyping}
                  onClick={() => void handleSend(q)}
                  className="w-full text-left p-2.5 rounded-xl border border-siftrix-border bg-siftrix-pearl hover:bg-white hover:border-siftrix-gold text-xs text-siftrix-graphite transition-all cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold text-siftrix-antique-ink">💡 </span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="siftrix-panel-charcoal-inset p-5 rounded-2xl text-xs space-y-2 text-[#C8C1B6]">
            <p className="font-semibold text-siftrix-champagne">
              Multi-Agent Orchestration
            </p>
            <p className="leading-relaxed">
              SIFTRIX AI Cyber Advisor provides heuristics from URL Intelligence, Message Intelligence, and Security Advisor agents. Real LLM endpoints connect in future backend iterations.
            </p>
          </div>
        </aside>

        {/* Right Side: Message Thread */}
        <div className="min-w-0 lg:col-span-8 siftrix-card rounded-2xl flex flex-col h-[38rem] overflow-hidden">
          {/* Thread Header */}
          <div className="px-5 py-3.5 bg-siftrix-pearl border-b border-siftrix-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-siftrix-charcoal">
                Active Advisor Session
              </span>
            </div>
            <span className="text-[11px] text-siftrix-muted-dark">
              {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-siftrix-beige/30 text-xs sm:text-sm">
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
                    className={`max-w-[85%] rounded-2xl p-4 space-y-2 shadow-2xs leading-relaxed ${
                      isUser
                        ? 'bg-siftrix-charcoal text-siftrix-pearl rounded-tr-xs'
                        : 'bg-white border border-siftrix-border text-siftrix-charcoal rounded-tl-xs'
                    }`}
                  >
                    <div
                      className="whitespace-pre-wrap break-words prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed"
                      dir={msg.language === 'ur' ? 'rtl' : 'ltr'}
                    >
                      {msg.content}
                    </div>

                    {msg.citations && msg.citations.length > 0 ? (
                      <div className="pt-2 border-t border-siftrix-border/60 flex flex-wrap gap-1.5 text-[10px] text-siftrix-muted-dark">
                        <span className="font-semibold text-siftrix-antique-ink">
                          Verified Sources:
                        </span>
                        {msg.citations.map((cite) => (
                          <span
                            key={cite}
                            className="rounded bg-siftrix-pearl px-2 py-0.5 border border-siftrix-border"
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <span className="block text-[10px] text-siftrix-muted-dark text-right pt-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                      {msg.suggestedFollowUps.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void handleSend(prompt)}
                          className="text-xs font-medium text-siftrix-graphite bg-white hover:bg-siftrix-pearl border border-siftrix-gold/50 rounded-full px-3 py-1 text-left transition-colors cursor-pointer shadow-2xs"
                        >
                          💡 {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}

            {isTyping ? (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white border border-siftrix-border text-siftrix-charcoal w-fit rounded-tl-xs">
                <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs font-medium text-siftrix-muted-dark ml-1">
                  SIFTRIX Advisor is synthesizing response...
                </span>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-4 bg-white border-t border-siftrix-border flex items-center gap-2.5 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              disabled={isTyping}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about phishing, suspicious URLs, SMS lures, or incident response..."
              className="flex-1 rounded-xl border border-siftrix-border bg-siftrix-pearl px-4 py-3 text-xs sm:text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="siftrix-btn-gold px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
            >
              <span>Send Prompt</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
