export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  citations?: string[]
  suggestedFollowUps?: string[]
  language?: 'en' | 'ur' | 'both'
}

export const CHAT_STORAGE_KEY = 'siftrix_chat_history_v1'

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'How do I identify a phishing link before clicking?',
  'What should I do if I clicked a suspicious link?',
  'What is SSRF and why is it dangerous?',
  'How does SIFTRIX analyze suspicious URLs and SMS?',
  'کیا آپ اردو میں سائبر سیکیورٹی رہنمائی فراہم کر سکتے ہیں؟',
]

const INITIAL_GREETING: ChatMessage = {
  id: 'msg_welcome',
  role: 'assistant',
  content:
    'Greetings! I am the SIFTRIX AI Cybersecurity Advisor. You can ask me to evaluate suspicious link characteristics, explain phishing attack vectors, review smishing warning signs, or advise on immediate breach containment.',
  timestamp: new Date().toISOString(),
  citations: ['SIFTRIX Threat Intelligence Core', 'NIST Cybersecurity Framework'],
  suggestedFollowUps: [
    'How do I identify a phishing link before clicking?',
    'What should I do if I clicked a suspicious link?',
    'What is SSRF and why is it dangerous?',
  ],
}

export function createUserMessage(content: string): ChatMessage {
  return {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
}

let memoryChatHistory: ChatMessage[] | null = null

/**
 * Loads persisted chat history from localStorage or initializes with the welcome message.
 */
export function loadChatHistory(): ChatMessage[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      if (!raw) return [INITIAL_GREETING]
      const parsed = JSON.parse(raw) as ChatMessage[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_GREETING]
    }
  } catch {
    // fallback to memory
  }
  return memoryChatHistory && memoryChatHistory.length > 0 ? memoryChatHistory : [INITIAL_GREETING]
}

/**
 * Persists chat history into localStorage.
 */
export function saveChatHistory(messages: ChatMessage[]): void {
  memoryChatHistory = messages
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clears chat history and restores the initial greeting.
 */
export function clearChatHistory(): ChatMessage[] {
  memoryChatHistory = null
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
  return [INITIAL_GREETING]
}

/**
 * AI Cybersecurity response generator using simulated NLP intent recognition.
 * Prepares the frontend contract for seamless integration with real LLM APIs.
 */
export async function sendChatMessage(
  prompt: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  // Simulate network/streaming latency
  await new Promise((resolve) => setTimeout(resolve, 600))

  const cleanPrompt = prompt.trim().toLowerCase()
  const isUrduQuery = /[\u0600-\u06FF]/.test(prompt) || cleanPrompt.includes('urdu')

  let responseContent: string
  let citations: string[]
  let suggestedFollowUps: string[]

  if (isUrduQuery) {
    responseContent = `**SIFTRIX سائبر سیکیورٹی مشیر کی رہنمائی:**

1. **مشکوک لنکس کی فوری شناخت:**
   - ڈومین کے ہجے غور سے دیکھیں۔ ہیکرز اکثر ملتی جلتی ڈومینز (جیسے \`chase-security.xyz\`) استعمال کرتے ہیں۔
   - کسی نامعلوم SMS یا ای میل میں فوری لاگ ان کرنے یا OTP شیئر کرنے سے گریز کریں۔

2. **اگر آپ نے مشکوک لنک کھول دیا ہو:**
   - اپنے براؤزر کا انٹرنیٹ فوری منقطع کریں۔
   - اس سروس کا پاس ورڈ کسی محفوظ ڈیوائس سے فوراً تبدیل کریں۔
   - دو طرفہ تصدیق (2FA) فعال رکھیں۔

SIFTRIX کا تھریٹ سکینر آپ کو اردو اور انگریزی دونوں میں تفصیلی تجزیہ فراہم کرتا ہے۔`
    citations = ['SIFTRIX اردو سیکیورٹی گائیڈ', 'OWASP Phishing Defense']
    suggestedFollowUps = [
      'What should I do if I clicked a suspicious link?',
      'How does SIFTRIX analyze suspicious URLs and SMS?',
    ]
  } else if (cleanPrompt.includes('clicked') || cleanPrompt.includes('opened') || cleanPrompt.includes('victim')) {
    responseContent = `### 🚨 Immediate Breach Containment Protocol

If you clicked an untrusted or suspicious link, execute these containment steps immediately:

1. **Do NOT Enter Credentials**: If a login or payment form opened, close the tab immediately without typing your password, OTP, or credit card details.
2. **Disconnect Network**: Turn off Wi-Fi or disconnect Ethernet on the affected device to halt background payload downloads or C2 (Command & Control) beacons.
3. **Reset Passwords from a Clean Device**:
   - Access the target service (e.g. your bank, email, or Google account) from a secondary known-clean device.
   - Update your password and terminate all active sessions (\`Sign out of all devices\`).
4. **Enable Multi-Factor Authentication (MFA)**: Enforce authenticator-app or hardware-key 2FA. Avoid SMS 2FA if SIM-swapping is suspected.
5. **Scan for Malware**: Run a thorough endpoint security scan on the machine.
6. **Report the Threat**: Submit the suspicious link into SIFTRIX Threat Scanner to log indicators of compromise (IoC) in your Security Audit Log.`
    citations = ['CISA Incident Handling Guidelines', 'NIST SP 800-61 Rev 2']
    suggestedFollowUps = [
      'How do I identify a phishing link before clicking?',
      'What is SSRF and why is it dangerous?',
    ]
  } else if (cleanPrompt.includes('identify') || cleanPrompt.includes('spot') || cleanPrompt.includes('phishing') || cleanPrompt.includes('link')) {
    responseContent = `### 🔍 How to Identify Phishing Links Like a SOC Analyst

Attackers use visual deception to masquerade as trusted organizations. Look for these four red flags:

1. **Deceptive Top-Level Domains (TLDs)**:
   - Legitimate: \`https://chase.com\`
   - Phishing: \`https://chase-security-verify.xyz\` or \`http://login.bank.com.suspicious-domain.ru\`
   - *Rule*: Read from right to left before the first slash to identify the true root domain.
2. **Homograph & Punycode Attacks**:
   - Attackers substitute Cyrillic or Greek characters that look identical to Latin letters (e.g. \`gооgle.com\` where 'о' is Cyrillic).
3. **Artificial Urgency & Pressure Tactics**:
   - Phrases like *"Account suspended in 24 hours"*, *"Pending courier fee of $1.50"*, or *"Unusual activity detected"*.
4. **Unencrypted HTTP or Free Hosting**:
   - Free subdomains (\`.workers.dev\`, \`.firebaseapp.com\`, \`.weebly.com\`) hosting login forms for corporate brands.

*Tip: Paste any suspicious URL directly into the SIFTRIX Threat Scanner to run automated heuristic and reputation scoring.*`
    citations = ['MITRE ATT&CK T1566: Phishing', 'VirusTotal URL Intelligence']
    suggestedFollowUps = [
      'What is SSRF and why is it dangerous?',
      'How does SIFTRIX analyze suspicious URLs and SMS?',
      'What should I do if I clicked a suspicious link?',
    ]
  } else if (cleanPrompt.includes('ssrf')) {
    responseContent = `### 🛡️ Server-Side Request Forgery (SSRF) Explained

**SSRF (Server-Side Request Forgery)** occurs when an attacker induces a server application to make HTTP requests to an arbitrary domain of the attacker's choosing.

**Why it is critical in URL Scanners:**
When a cybersecurity tool scans a URL, it must inspect the destination. Without robust SSRF defenses, an attacker could supply \`http://169.254.169.254\` (AWS metadata endpoint) or \`http://localhost:8080/admin\` to trick the scanner into dumping internal cloud credentials.

**How SIFTRIX Mitigates SSRF:**
- Strict scheme filtering (only \`http://\` and \`https://\` accepted).
- Rejection of loopback addresses (\`localhost\`, \`127.0.0.1\`, \`::1\`).
- Rejection of private RFC 1918 IPv4 ranges (\`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`).
- Strict cloud metadata boundary protection.`
    citations = ['OWASP Top 10 A10: Server-Side Request Forgery', 'RFC 1918 Private Addressing']
    suggestedFollowUps = [
      'How does SIFTRIX analyze suspicious URLs and SMS?',
      'How do I identify a phishing link before clicking?',
    ]
  } else if (cleanPrompt.includes('siftrix') || cleanPrompt.includes('how does') || cleanPrompt.includes('agent')) {
    responseContent = `### ⚡ The SIFTRIX Multi-Agent Cybersecurity Architecture

SIFTRIX employs a triple-agent orchestrated defense mesh:

1. **URL Intelligence Agent**:
   - Inspects URL entropy, scheme boundaries, TLD risk, and SSRF restrictions.
   - Queries external intelligence signals (such as VirusTotal) to check domain reputation.
2. **Message Intelligence Agent**:
   - Analyzes textual content, SMS messages, and emails using Natural Language Processing.
   - Detects social engineering urgency, authority impersonation, and credential traps.
3. **Security Advisor Agent**:
   - Synthesizes findings from both specialized agents into a unified 0–100 risk score.
   - Produces clear, actionable threat advisories in both **English** and **Urdu (اردو)**.

All scans automatically persist to your browser's audit log and Security Dashboard.`
    citations = ['SIFTRIX Architecture Blueprint v2', 'FastAPI Multi-Agent Pipeline']
    suggestedFollowUps = [
      'How do I identify a phishing link before clicking?',
      'What should I do if I clicked a suspicious link?',
    ]
  } else {
    responseContent = `Thank you for your cybersecurity question. 

Regarding **"${prompt.slice(0, 80)}"**:
SIFTRIX continuously evaluates attack surfaces across URLs, SMS messages, and email lures. Key safety fundamentals to keep in mind:
- Always verify the authentic root domain before entering passwords.
- Treat unsolicited messages containing links or attachments with zero trust.
- Leverage multi-factor authentication (MFA) across all sensitive workspaces.
- You can paste any suspicious string directly into the SIFTRIX scanner at the top of the platform for automated multi-agent threat grading.

Would you like specific advice on phishing indicators, incident containment, or SSRF protection?`
    citations = ['SIFTRIX Knowledge Base', 'Center for Internet Security (CIS)']
    suggestedFollowUps = [
      'How do I identify a phishing link before clicking?',
      'What should I do if I clicked a suspicious link?',
      'What is SSRF and why is it dangerous?',
    ]
  }

  const assistantMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
    citations,
    suggestedFollowUps,
    language: isUrduQuery ? 'ur' : 'en',
  }

  const updatedHistory = [...history, assistantMessage]
  saveChatHistory(updatedHistory)

  return assistantMessage
}
