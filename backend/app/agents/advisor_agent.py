"""Security Advisor Agent for Siftrix actionable remediation and bilingual guidance."""
import logging
from typing import Dict, Any, List, Tuple

from app.agents.base import BaseAgent
from app.schemas.common import BilingualText, BilingualList
from app.schemas.scan import AdvisorAgentFinding, MessageAgentFinding, URLAgentFinding

logger = logging.getLogger(__name__)

# Verified Pakistani Reporting Channels (Official)
NCCIA_HELPLINE = "1799"
NCCIA_PORTAL = "https://complaint.nccia.gov.pk/"
PTA_HELPLINE = "0800-55055"
PTA_SMS_SHORTCODE = "9000"
SBP_HELPLINE = "021-111-727-273"


class SecurityAdvisorAgent(BaseAgent):
    """Generates tiered incident response playbooks and localized bilingual guidance."""

    def __init__(self):
        super().__init__(name="SecurityAdvisorAgent")

    async def advise(
        self,
        risk_level: str,
        verdict: str,
        overall_score: float,
        message_finding: MessageAgentFinding | None = None,
        url_finding: URLAgentFinding | None = None,
        target_content: str = "",
    ) -> Tuple[AdvisorAgentFinding, BilingualText, BilingualList]:
        """Synthesize findings into actionable dos/donts and localized bilingual guidance."""

        # 1. Base Tiered Deterministic Playbooks
        if risk_level == "low":
            action_required = "No immediate threat detected. Exercise routine cyber caution."
            dos_en = [
                "Verify unprompted messages through independent official channels.",
                "Keep device operating systems and mobile banking apps updated.",
            ]
            donts_en = [
                "Never share sensitive personal information or passwords with unknown contacts.",
            ]
            summary_en = "The scanned content does not exhibit known phishing indicators or malicious signatures."
            summary_ur = "Is scan kiye gaye content mein kisi fraud ya phishing ka wazeh khatra nazar nahi aaya."
            recs_en = [
                "Always verify unexpected communications before sharing details.",
                "Use two-factor authentication on all sensitive financial accounts.",
            ]
            recs_ur = [
                "Ghair mutawaqqe paighaamat par hamesha ahtiyaat baratna munasib hai.",
                "Apne tamam bank aur wallet accounts par two-factor authentication (2FA) fa'al karein.",
            ]

        elif risk_level == "medium":
            action_required = "Suspicious activity detected. Exercise high caution and verify sender independently."
            dos_en = [
                f"Report suspicious SMS to PTA by forwarding the sender number and message to {PTA_SMS_SHORTCODE}.",
                "Verify the sender's identity by calling the official published helpline of the organization.",
                "Block the sender if you did not initiate this communication.",
            ]
            donts_en = [
                "Do not click any links or download attachments included in the message.",
                "Never disclose your OTP, banking PIN, or CNIC number under any circumstances.",
            ]
            summary_en = "Suspicious indicators detected. The content exhibits potential social engineering or deceptive patterns."
            summary_ur = "Mashkook khatraat paye gaye hain. Yeh paighaam farzi ya dhokay baazi par mabni ho sakta hai."
            recs_en = [
                f"Report unsolicited SMS scams to PTA by texting {PTA_SMS_SHORTCODE}.",
                "Contact your bank only through the official helpline number printed on your card.",
            ]
            recs_ur = [
                f"Mashkook SMS ki itla PTA ko 9000 par sender number ke sath SMS kar ke dein.",
                "Bank se rabtay ke liye sirf apne card ki pusht par mojood official helpline istemal karein.",
            ]

        else:  # high
            action_required = "Critical threat detected. Do not interact. Immediate containment and reporting required."
            dos_en = [
                f"File an official cybercrime report with NCCIA at {NCCIA_PORTAL} or call {NCCIA_HELPLINE}.",
                "If banking credentials or OTP were shared, immediately call your bank via the number on your card to freeze accounts.",
                f"Report fraudulent SMS to PTA by texting the sender number and text to {PTA_SMS_SHORTCODE}.",
                "Block and report the sender on your messaging application immediately.",
            ]
            donts_en = [
                "Do NOT click any links, open attachments, or reply to this message.",
                "Never share OTPs, passwords, or transfer advance processing fees.",
                "Do not call any phone numbers provided within the fraudulent message.",
            ]
            summary_en = "High-risk threat detected. Strong evidence of credential harvesting, financial scamming, or malicious targeting."
            summary_ur = "Khatarnaak phishing attack detected. Yeh paighaam aap ki raqam ya password churanay ke liye bheja gaya hai."
            recs_en = [
                f"Report this scam immediately to NCCIA at {NCCIA_PORTAL} or call {NCCIA_HELPLINE}.",
                "Call your bank immediately if any financial details were disclosed.",
                f"Forward the fraudulent message to PTA at {PTA_SMS_SHORTCODE} to block the scammer's SIM.",
            ]
            recs_ur = [
                f"Is fraud ki foran NCCIA ko portal ({NCCIA_PORTAL}) par ya helpline {NCCIA_HELPLINE} par complaint darj karein.",
                "Agar aap ne koi maloomat share kar di hain to foran apne bank se rabta kar ke account freeze karwayen.",
                f"Spammer ki SIM block karwanay ke liye message {PTA_SMS_SHORTCODE} par PTA ko forward karein.",
            ]

        # 2. Contextual Enrichment from Active Agent Findings
        if message_finding:
            if message_finding.credential_harvesting_detected:
                recs_en.insert(0, f"Immediately contact your bank or call SBP helpline at {SBP_HELPLINE} to freeze accounts.")
                recs_ur.insert(0, f"Foran apne bank ya State Bank helpline {SBP_HELPLINE} par rabta kar ke account freeze karwayen.")
            if message_finding.urgency_detected and risk_level != "low":
                donts_en.append("Do not act under artificial pressure or urgent deadlines.")
            if message_finding.impersonation_detected and risk_level != "low":
                dos_en.append("Verify communications directly through verified websites, not provided links.")

        if url_finding:
            if url_finding.suspicious_tld or any("shortener" in ind.lower() for ind in url_finding.indicators):
                donts_en.append("Never open shortened or masked links from unsolicited messages.")
            if url_finding.virustotal_malicious_count and url_finding.virustotal_malicious_count > 0:
                dos_en.append("Clear browser cache and scan device with antivirus after visiting flagged URL.")

        advisor_finding = AdvisorAgentFinding(
            action_required=action_required,
            dos=dos_en,
            donts=donts_en,
        )

        bilingual_summary = BilingualText(
            en=summary_en,
            ur=summary_ur,
        )

        bilingual_recommendations = BilingualList(
            en=recs_en,
            ur=recs_ur,
        )

        return advisor_finding, bilingual_summary, bilingual_recommendations


security_advisor = SecurityAdvisorAgent()
