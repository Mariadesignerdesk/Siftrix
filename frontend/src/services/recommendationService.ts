import type { ScanRiskLevel, ScanTargetType } from './api'

export interface ActionChecklistItem {
  id: string
  title: string
  description: string
  priority: 'immediate' | 'high' | 'standard'
  timeEstimate: string
  completed?: boolean
}

export interface RecommendationPlan {
  riskLevel: ScanRiskLevel
  title: string
  subtitle: string
  description: string
  threatSummary: string
  checklist: ActionChecklistItem[]
  incidentSteps: string[]
  technicalSafeguards: string[]
  advisoryQuote: string
}

const RECOMMENDATIONS_DATA: Record<ScanRiskLevel, RecommendationPlan> = {
  low: {
    riskLevel: 'low',
    title: 'Routine Cyber Hygiene & Verification Protocol',
    subtitle: 'Threat score below 20 — Legitimate infrastructure confirmed',
    description:
      'The inspected target demonstrates high trust reputation, valid cryptographic credentials, and no indicator of malicious payload delivery.',
    threatSummary:
      'Verified clean by SIFTRIX multi-agent intelligence. Standard enterprise baseline procedures apply.',
    checklist: [
      {
        id: 'chk_low_1',
        title: 'Maintain Multi-Factor Authentication',
        description: 'Ensure hardware security keys or authenticator apps are active on your personal and work accounts.',
        priority: 'standard',
        timeEstimate: '2 mins',
      },
      {
        id: 'chk_low_2',
        title: 'Periodic Password Rotation',
        description: 'Verify your login credentials have not appeared in known public breach compilations.',
        priority: 'standard',
        timeEstimate: '5 mins',
      },
      {
        id: 'chk_low_3',
        title: 'Browser & Extension Auditing',
        description: 'Review active browser extensions and remove unused third-party permissions.',
        priority: 'standard',
        timeEstimate: '3 mins',
      },
    ],
    incidentSteps: [
      'Bookmark official domains to prevent future typosquatting exposure.',
      'Regularly backup critical offline encrypted storage vaults.',
    ],
    technicalSafeguards: [
      'Enable DNS-over-HTTPS (DoH) with threat filtering.',
      'Enforce TLS 1.3 protocol standards on outbound connections.',
    ],
    advisoryQuote:
      'Cyber defense is not a single barrier, but continuous diligence in everyday digital interactions.',
  },

  medium: {
    riskLevel: 'medium',
    title: 'Precautionary Defense & Verification Protocol',
    subtitle: 'Threat score between 20-59 — Ambiguous or unvetted characteristics detected',
    description:
      'Target exhibits suspicious signals such as recently registered domains, obscured redirect chains, or urgency-inducing language patterns.',
    threatSummary:
      'SIFTRIX detected intermediate anomalies. Proceed with elevated skepticism and complete the safety checklist before interacting.',
    checklist: [
      {
        id: 'chk_med_1',
        title: 'Inspect Final Destination Before Clicking',
        description: 'Unshorten link or execute a HEAD request to observe HTTP 301/302 redirect locations without rendering scripts.',
        priority: 'high',
        timeEstimate: '1 min',
      },
      {
        id: 'chk_med_2',
        title: 'Cross-Check Sender Out-of-Band',
        description: 'If received via SMS or email, confirm the request via a known secondary communications channel (e.g., Slack or official phone).',
        priority: 'high',
        timeEstimate: '3 mins',
      },
      {
        id: 'chk_med_3',
        title: 'Isolate in Sandboxed Container',
        description: 'Inspect suspicious web resources inside a disposable virtual machine or isolated browser profile.',
        priority: 'standard',
        timeEstimate: '5 mins',
      },
    ],
    incidentSteps: [
      'Do not submit corporate Single Sign-On (SSO) credentials on unvetted endpoints.',
      'Inspect digital signature and domain WHOIS creation dates.',
      'Notify team security champions if related messages were sent in bulk.',
    ],
    technicalSafeguards: [
      'Implement DMARC policy enforcement (p=quarantine or p=reject).',
      'Configure proxy inspection for unclassified newly-registered domains (< 30 days).',
    ],
    advisoryQuote:
      'When in doubt, pause and verify out-of-band. 30 seconds of skepticism prevents days of breach containment.',
  },

  high: {
    riskLevel: 'high',
    title: 'Active Threat Mitigation & Containment Protocol',
    subtitle: 'Threat score between 60-84 — Severe social engineering or credential deception signals',
    description:
      'Target features deliberate deception mechanics including brand lookalike assets, deceptive urgency, or direct payment redirection.',
    threatSummary:
      'High-confidence attack pattern. Immediate defensive intervention is strongly recommended to protect user assets.',
    checklist: [
      {
        id: 'chk_high_1',
        title: 'Immediate Connection Severance',
        description: 'Do not interact, click, or download any attachments from the message or URL.',
        priority: 'immediate',
        timeEstimate: 'Immediate',
      },
      {
        id: 'chk_high_2',
        title: 'Password Invalidation & Session Revocation',
        description: 'If credentials were entered anywhere on this target, immediately change passwords and kill all active sessions.',
        priority: 'immediate',
        timeEstimate: '3 mins',
      },
      {
        id: 'chk_high_3',
        title: 'Perimeter Blocklist Submission',
        description: 'Add the malicious domain and IP range to perimeter firewall and DNS sinkholes.',
        priority: 'high',
        timeEstimate: '5 mins',
      },
      {
        id: 'chk_high_4',
        title: 'Submit Incident Telemetry',
        description: 'Forward threat details to the internal SOC / Security Incident Response Team.',
        priority: 'high',
        timeEstimate: '5 mins',
      },
    ],
    incidentSteps: [
      'Disconnect workstation network interface if executable payload was downloaded.',
      'Check browser download history and empty cache completely.',
      'Audit mailbox forwarding rules for unauthorized exfiltration configurations.',
    ],
    technicalSafeguards: [
      'Deploy automated DNS sinkholing for confirmed malicious hosts.',
      'Trigger Endpoint Detection and Response (EDR) full-disk scanning.',
    ],
    advisoryQuote:
      'Containment speed is decisive. Quarantining malicious vectors within the first 15 minutes neutralizes 90% of follow-up attacks.',
  },

  critical: {
    riskLevel: 'critical',
    title: 'Critical Emergency Breach Isolation Protocol',
    subtitle: 'Threat score 85-100 — Confirmed active weaponized exploit, drainer, or credential harvester',
    description:
      'Malicious attack vector verified by SIFTRIX intelligence. Attack targets private cryptographic keys, multi-factor tokens, or direct financial theft.',
    threatSummary:
      'CRITICAL BREACH HAZARD: Lethal phishing lure or weaponized infrastructure. Strict containment protocol must be executed immediately.',
    checklist: [
      {
        id: 'chk_crit_1',
        title: 'Emergency Account Lockout',
        description: 'Trigger immediate account freeze or session invalidation across all federated corporate identity providers.',
        priority: 'immediate',
        timeEstimate: 'Immediate',
      },
      {
        id: 'chk_crit_2',
        title: 'Revoke Financial / Web3 Token Permissions',
        description: 'If a wallet or payment card was exposed, contact banking fraud hotline or invoke token approval revocation (Revoke.cash).',
        priority: 'immediate',
        timeEstimate: '2 mins',
      },
      {
        id: 'chk_crit_3',
        title: 'Physical Host Network Isolation',
        description: 'Disconnect Ethernet cable and disable Wi-Fi/Bluetooth on all affected endpoint hardware.',
        priority: 'immediate',
        timeEstimate: 'Immediate',
      },
      {
        id: 'chk_crit_4',
        title: 'Initiate P1 Forensics Preservation',
        description: 'Preserve system memory dumps (RAM) and network logs before restarting or wiping endpoints.',
        priority: 'high',
        timeEstimate: '10 mins',
      },
    ],
    incidentSteps: [
      'Contact SIFTRIX Emergency CSIRT or company security hotline immediately.',
      'Notify all team members receiving identical lures to avoid collateral compromise.',
      'File official reports with CISA (cisa.gov) and Federal Trade Commission (ReportFraud.ftc.gov).',
    ],
    technicalSafeguards: [
      'Global perimeter BGP route block / IP null-routing.',
      'Full credential revocation for all identities accessing the host within 24 hours.',
      'EDR automated containment and forensic image generation.',
    ],
    advisoryQuote:
      'Critical containment demands speed, composure, and zero assumptions. Isolate the blast radius immediately.',
  },
}

/**
 * Retrieves the comprehensive recommendation plan for a specific risk level.
 */
export function getRecommendationsForRisk(
  riskLevel: ScanRiskLevel,
  targetType?: ScanTargetType
): RecommendationPlan {
  const plan = RECOMMENDATIONS_DATA[riskLevel] || RECOMMENDATIONS_DATA.medium
  if (targetType) {
    return plan
  }
  return plan
}

/**
 * Returns all four risk scenario mitigation blueprints.
 */
export function getAllRiskScenarios(): Record<ScanRiskLevel, RecommendationPlan> {
  return RECOMMENDATIONS_DATA
}
