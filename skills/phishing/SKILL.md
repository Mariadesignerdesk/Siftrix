---
name: phishing
description: Domain skill and knowledge base for analyzing phishing, smishing, and scam lures with Pakistan-specific threat intelligence.
---

# Phishing Detection & Threat Analysis Skill

## 1. Overview
This skill defines the detection rules, heuristics, and threat catalog used to identify phishing, smishing, and scam lures. All scoring follows the deterministic PhishGuard AI Build Guide scoring rules.

---

## 2. Rule-Based Scoring Matrix

### A. Message Indicators
Each indicator key contributes at most once to the total score, regardless of keyword repetition:

| Indicator Key | Criteria / Patterns | Weight |
| :--- | :--- | :---: |
| `credential_request` | Requests for passwords, OTPs, PIN codes, CNIC numbers, or debit/credit card CVV/details. | **+30** |
| `urgency_threat` | Artificial deadlines, warnings of account suspension, SIM block, legal action, or police arrest. | **+15** |
| `unrealistic_prize_job` | Lottery prizes ("Jeeto Pakistan", "Inam Nikla Hai"), unexpected BISP funds, or unverified high-paying job offers. | **+20** |
| `payment_transfer` | Demands for fee payments, account reactivation fees, customs clearance charges, or advance deposits. | **+20** |
| `impersonation` | Poses as an official institution: banks (HBL, UBL, Meezan, Bank Alfalah), government (FBR, NADRA, BISP), or couriers (TCS, Pakistan Post). | **+10** |
| `suspicious_link` | Urges user to click an external, unverified, or masked link. | **+10** |

### B. URL Indicators
Each indicator key contributes at most once to the total score:

| Indicator Key | Criteria / Patterns | Weight |
| :--- | :--- | :---: |
| `ip_host` | Hostname is an explicit IPv4 or IPv6 address literal (e.g., `http://192.0.2.1/`). | **+20** |
| `url_shortener` | Known link shortener service used (e.g., `bit.ly`, `tinyurl.com`, `t.co`, `is.gd`, `cutt.ly`). | **+15** |
| `lookalike_subdomains` | Typosquatting/homoglyph domain (e.g., `paypa1`, `amaz0n`, `hbl-portal`) or excessive subdomains (> 3 dots). | **+15** |
| `at_symbol_punycode` | Contains `@` in authority or punycode prefix (`xn--`) in domain. | **+15** |
| `no_https` | Plain `http://` scheme used instead of encrypted `https://`. | **+10** |
| `suspicious_tld` | High-abuse or abnormal TLD (`.xyz`, `.top`, `.tk`, `.ml`, `.ga`, `.cf`, `.gq`, `.buzz`, `.fit`, `.work`). | **+10** |

### C. VirusTotal Intelligence (Mutually Exclusive)
* **1 to 4 malicious detections:** **+20**
* **5 or more malicious detections:** **+35** (replaces the +20; never +55)
* **Unavailable / pending / rate-limited / blocked:** **+0** (zero score added)

### D. Scoring Constraints
* Maximum score: **100.0**
* Compound scan (Message with URL): $\text{overall\_score} = \max(\text{message\_score}, \text{url\_score})$
* Risk Level Boundaries:
  * `0.0 – 29.9`: **LOW**
  * `30.0 – 59.9`: **MEDIUM**
  * `60.0 – 100.0`: **HIGH**

---

## 3. Pakistan-Specific Scam Profiles

### Profile 1: Mobile Wallet Impersonation (JazzCash / EasyPaisa)
* **Vector:** SMS from standard 11-digit mobile numbers (+92-3xx-xxxxxxx) claiming to be "JazzCash Support" or "EasyPaisa Alert".
* **Lure:** "Aap ka account biometric verification na honay ki wajah se block kar diya gaya hai. Foran is link par click karein ya OTP share karein."
* **Indicators:** `credential_request` (+30), `urgency_threat` (+15), `impersonation` (+10). Total = 55 (Medium/Suspicious).

### Profile 2: Commercial Bank Phishing (HBL / UBL / Meezan)
* **Vector:** Unsolicited SMS or WhatsApp claiming ATM card or internet banking suspension.
* **Lure:** "HBL Alert: Your debit card is blocked. Call helpline or verify at http://hbl-auth-portal.xyz".
* **Indicators:** `credential_request` (+30), `urgency_threat` (+15), `impersonation` (+10), `suspicious_link` (+10). URL: `no_https` (+10), `suspicious_tld` (+10), `lookalike_subdomains` (+15).

### Profile 3: Government Lures (BISP / FBR)
* **Vector:** WhatsApp or SMS announcing fake monetary grants or tax refunds.
* **Lure:** "Benazir Income Support Programme ki taraf se aap ke naam 25,000 rupay jaari kiye gaye hain. Wasool karne ke liye fees jama karein."
* **Indicators:** `unrealistic_prize_job` (+20), `payment_transfer` (+20), `impersonation` (+10). Total = 50 (Medium/Suspicious).
