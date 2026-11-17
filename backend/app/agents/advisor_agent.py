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

# Natural Urdu translations for all threat indicators
INDICATOR_URDU_TRANSLATIONS: Dict[str, str] = {
    "Sensitive credential or personal identity data requested": "حساس معلومات یا پاس ورڈ کی چوری کی کوشش",
    "Artificial urgency, deadline, or punitive threat detected": "فوری کارروائی کا غیر حقیقی دباؤ یا اکاؤنٹ بندش کی دھمکی",
    "Unrealistic prize, lottery, or unsolicited financial grant lure": "جعلی لاٹری، انعامی اسکیم یا مفت گرانٹ کا جھانسا",
    "Advance fee, transfer charge, or money request detected": "پیشگی فیس، چارجز یا رقم کی منتقلی کا مشکوک مطالبہ",
    "Impersonation of trusted financial, government, or courier institution": "معروف بینک، سرکاری ادارے یا کوریئر سروس کی جعلی شناخت",
    "Embedded link or external call-to-action detected": "پیغام میں بیرونی ویب سائٹ کا مشکوک لنک شامل ہے",
    "Adversarial prompt injection attempt detected: text contains command override directives": "سیکیورٹی احکامات کو بائی پاس کرنے کی مشکوک کوشش",
    "Unencrypted HTTP protocol used instead of HTTPS": "غیر محفوظ پروٹوکول (HTTP)، ڈیٹا انکرپٹڈ نہیں ہے",
    "Explicit IP address used as hostname instead of a registered domain": "رجسٹرڈ ڈومین کی بجائے براہ راست آئی پی ایڈریس کا مشکوک استعمال",
    "URL shortener service obfuscating true destination": "اصل ویب ایڈریس چھپانے کے لیے لنک شارٹنر کا استعمال",
    "URL contains @ symbol credential lure or punycode domain": "لنک میں مشکوک علامات یا دھوکہ دہی کا عنصر موجود ہے",
    "URL authority contains embedded @ symbol credential lure": "یو آر ایل کے ایڈریس میں مشکوک علامت (@) موجود ہے",
    "Unicode confusable or homoglyph brand impersonation detected": "معروف برانڈ سے مشابہت کے لیے جعلی یونیکوڈ یا ہوموگلیف حروف کا استعمال",
    "Typosquatting brand lure or excessive subdomain nesting detected": "معروف برانڈ سے مشابہت (ٹائپو اسکواٹنگ) یا مشکوک سب ڈومینز",
    "High-abuse or abnormal top-level domain (TLD) detected": "غیر معمولی یا اکثر فراڈ میں استعمال ہونے والی ڈومین ایکسٹینشن",
    "URL passed static SSRF validation (Note: this does not guarantee the site is phishing-free)": "یو آر ایل نے بنیادی سیکیورٹی جانچ پاس کر لی ہے",
    "URL targeting internal or restricted network address (SSRF check blocked)": "یو آر ایل اندرونی نیٹ ورک ایڈریس کو نشانہ بنا رہا ہے (بلاک شدہ)",
    "Static URL validation service unavailable": "یو آر ایل کی تصدیقی سروس اس وقت دستیاب نہیں ہے",
    "Critical credential phishing attack pattern detected: urgent credential harvesting via external link": "شدید نوعیت کا فشنگ حملہ: بیرونی لنک کے ذریعے پاس ورڈ یا حساس معلومات چوری کرنے کی کوشش",
}


# Safe Urdu fallback for unknown or unregistered threat indicators
UNKNOWN_INDICATOR_URDU_FALLBACK = "مشکوک سرگرمی کا غیر متعین اشارہ"


def translate_indicator_to_urdu(clean_ind: str) -> str:
    """Translate an English indicator label to natural Urdu script.
    
    If the indicator is unknown or unmapped, returns a safe Urdu fallback
    to prevent leaking raw English text into localized Urdu summaries.
    """
    if not clean_ind:
        return ""
    if clean_ind in INDICATOR_URDU_TRANSLATIONS:
        return INDICATOR_URDU_TRANSLATIONS[clean_ind]
    if clean_ind.startswith("VirusTotal detected"):
        return "وائرس ٹوٹل (VirusTotal) پر سیکیورٹی انجنوں نے اسے خطرناک قرار دیا ہے"
    for en_key, ur_val in INDICATOR_URDU_TRANSLATIONS.items():
        if en_key in clean_ind or clean_ind in en_key:
            return ur_val
    return UNKNOWN_INDICATOR_URDU_FALLBACK


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
            summary_ur = "اس مواد میں کسی معروف فشنگ، دھوکہ دہی یا سیکیورٹی خطرے کی علامات نہیں پائی گئیں۔"
            recs_en = [
                "Always verify unexpected communications before sharing details.",
                "Use two-factor authentication on all sensitive financial accounts.",
            ]
            recs_ur = [
                "غیر متوقع پیغامات اور لنکس پر کلک کرنے سے پہلے ہمیشہ خود تصدیق کریں۔",
                "اپنے تمام بینک اور حساس اکاؤنٹس پر ٹو فیکٹر توثیق (2FA) فعال رکھیں۔",
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
            summary_ur = "مشکوک عوامل پائے گئے ہیں۔ یہ پیغام دھوکہ دہی یا جعل سازی پر مبنی ہو سکتا ہے۔"
            recs_en = [
                f"Report unsolicited SMS scams to PTA by texting {PTA_SMS_SHORTCODE}.",
                "Contact your bank only through the official helpline number printed on your card.",
            ]
            recs_ur = [
                f"مشکوک ایس ایم ایس بھیجنے والے کا نمبر اور پیغام {PTA_SMS_SHORTCODE} پر پی ٹی اے (PTA) کو فارورڈ کریں۔",
                "بینک سے رابطے کے لیے صرف اپنے کارڈ کی پشت پر درج سرکاری ہیلپ لائن استعمال کریں۔",
                "پیغام میں موجود کسی بھی غیر تصدیق شدہ لنک پر کلک نہ کریں۔",
            ]

        elif risk_level == "high":
            if verdict == "suspicious":
                action_required = "High-risk suspicious activity detected. Exercise extreme caution and verify sender independently."
                dos_en = [
                    f"Report suspicious SMS to PTA by forwarding the sender number and message to {PTA_SMS_SHORTCODE}.",
                    "Verify the sender's identity by calling the official published helpline of the organization.",
                    "Block the sender if you did not initiate this communication.",
                ]
                donts_en = [
                    "Do NOT click any links, open attachments, or reply to this message.",
                    "Never disclose your OTP, banking PIN, or CNIC number under any circumstances.",
                    "Do not call any phone numbers provided within the message.",
                ]
                summary_en = "High-risk suspicious indicators detected. Strong potential social engineering or deceptive targeting."
                summary_ur = "انتہائی مشکوک عوامل پائے گئے ہیں۔ یہ مواد جعل سازی یا دھوکہ دہی پر مبنی ہو سکتا ہے۔"
                recs_en = [
                    f"Report unsolicited SMS scams to PTA by texting {PTA_SMS_SHORTCODE}.",
                    "Contact your bank only through the official helpline number printed on your card.",
                    "Do not interact with unverified links or phone numbers.",
                ]
                recs_ur = [
                    f"مشکوک ایس ایم ایس بھیجنے والے کا نمبر اور پیغام {PTA_SMS_SHORTCODE} پر پی ٹی اے (PTA) کو فارورڈ کریں۔",
                    "بینک سے رابطے کے لیے صرف اپنے کارڈ کی پشت پر درج سرکاری ہیلپ لائن استعمال کریں۔",
                    "پیغام میں موجود کسی بھی غیر تصدیق شدہ لنک پر کلک نہ کریں۔",
                ]
            else:  # malicious
                action_required = "High-risk threat detected. Do not interact. Immediate containment and reporting required."
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
                summary_ur = "شدید سیکیورٹی خطرہ پایا گیا ہے۔ یہ پیغام آپ کے پاس ورڈ یا رقم چرانے کے لیے بھیجا گیا ہے۔"
                recs_en = [
                    f"Report this scam immediately to NCCIA at {NCCIA_PORTAL} or call {NCCIA_HELPLINE}.",
                    "Call your bank immediately if any financial details were disclosed.",
                    f"Forward the fraudulent message to PTA at {PTA_SMS_SHORTCODE} to block the scammer's SIM.",
                ]
                recs_ur = [
                    f"این سی سی آئی اے (NCCIA) کے پورٹل ({NCCIA_PORTAL}) پر فوری شکایت درج کریں یا {NCCIA_HELPLINE} پر کال کریں۔",
                    "اگر آپ نے کوئی مالیاتی معلومات یا پاس ورڈ شیئر کیا ہے تو فوراً اپنے بینک سے رابطہ کر کے اکاؤنٹ منجمد کروائیں۔",
                    f"اسپیمر کی سم بلاک کروانے کے لیے میسج {PTA_SMS_SHORTCODE} پر پی ٹی اے کو فارورڈ کریں۔",
                    "پیغام بھیجنے والے کو اپنی میسجنگ ایپ پر فوری بلاک اور رپورٹ کریں۔",
                ]

        else:  # critical (score >= 90.0)
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
            summary_en = "Critical security threat detected. Confirmed malicious signatures, severe credential harvesting, or active cyber attack."
            summary_ur = "انتہائی شدید سیکیورٹی خطرہ پایا گیا ہے۔ یہ مواد آپ کے ڈیٹا یا بینک اکاؤنٹ پر براہ راست حملہ ہے۔"
            recs_en = [
                f"Report this scam immediately to NCCIA at {NCCIA_PORTAL} or call {NCCIA_HELPLINE}.",
                "Call your bank immediately if any financial details were disclosed.",
                f"Forward the fraudulent message to PTA at {PTA_SMS_SHORTCODE} to block the scammer's SIM.",
            ]
            recs_ur = [
                f"این سی سی آئی اے (NCCIA) کے پورٹل ({NCCIA_PORTAL}) پر فوری شکایت درج کریں یا {NCCIA_HELPLINE} پر کال کریں۔",
                "اگر آپ نے کوئی مالیاتی معلومات یا پاس ورڈ شیئر کیا ہے تو فوراً اپنے بینک سے رابطہ کر کے اکاؤنٹ منجمد کروائیں۔",
                f"اسپیمر کی سم بلاک کروانے کے لیے میسج {PTA_SMS_SHORTCODE} پر پی ٹی اے کو فارورڈ کریں۔",
                "پیغام بھیجنے والے کو اپنی میسجنگ ایپ پر فوری بلاک اور رپورٹ کریں۔",
            ]

        # 2. Contextual Enrichment from Active Agent Findings
        detected_indicators: List[str] = []
        if message_finding and message_finding.indicators:
            for ind in message_finding.indicators:
                clean_ind = ind.split(" (+")[0].strip()
                if clean_ind and clean_ind not in detected_indicators:
                    detected_indicators.append(clean_ind)
        if url_finding and url_finding.indicators:
            for ind in url_finding.indicators:
                clean_ind = ind.split(" (+")[0].strip()
                if clean_ind and clean_ind not in detected_indicators:
                    detected_indicators.append(clean_ind)

        has_findings = bool(detected_indicators) or (overall_score > 0.0 and verdict != "safe")

        # Ensure summary reflects actual findings and NEVER claims "no phishing indicators" when findings exist
        if has_findings:
            if detected_indicators:
                indicators_summary_en = "; ".join(detected_indicators[:3])
                urdu_indicators: List[str] = []
                for ind in detected_indicators[:3]:
                    ur_ind = translate_indicator_to_urdu(ind)
                    if ur_ind and ur_ind not in urdu_indicators:
                        urdu_indicators.append(ur_ind)
                indicators_summary_ur = "، ".join(urdu_indicators) if urdu_indicators else UNKNOWN_INDICATOR_URDU_FALLBACK

                if risk_level == "critical" or (risk_level == "high" and verdict != "suspicious"):
                    summary_en = f"High-risk threat detected: {indicators_summary_en}. Immediate containment and reporting required."
                    summary_ur = f"شدید سیکیورٹی خطرہ: {indicators_summary_ur}۔ یہ آپ کا ڈیٹا یا رقم چرانے کی کوشش ہے۔ فوری تدارک ضروری ہے۔"
                elif risk_level == "low":
                    summary_en = f"Low-risk content with contextual indicators: {indicators_summary_en}. Exercise routine cyber caution."
                    summary_ur = f"کم خطرے کا مواد: {indicators_summary_ur}۔ معمول کے مطابق سیکیورٹی احتیاط برتیں۔"
                else:
                    summary_en = f"Suspicious activity detected: {indicators_summary_en}. Exercise high caution."
                    summary_ur = f"مشکوک سرگرمی کی نشاندہی ہوئی ہے: {indicators_summary_ur}۔ براہ کرم احتیاط برتیں اور آزادانہ تصدیق کریں۔"
            else:
                if risk_level == "critical" or (risk_level == "high" and verdict != "suspicious"):
                    summary_en = "High-risk threat detected. Strong evidence of credential harvesting, financial scamming, or malicious targeting."
                    summary_ur = "شدید سیکیورٹی خطرہ پایا گیا ہے۔ معلومات کی چوری یا مالیاتی دھوکہ دہی کے شواہد موجود ہیں۔"
                elif risk_level == "low":
                    summary_en = "Low-risk content. Exercise routine cyber caution."
                    summary_ur = "کم خطرے کا مواد۔ معمول کے مطابق سیکیورٹی احتیاط برتیں۔"
                else:
                    summary_en = "Suspicious indicators detected. The content exhibits potential social engineering or deceptive patterns."
                    summary_ur = "مشکوک عوامل پائے گئے ہیں۔ یہ پیغام دھوکہ دہی یا جعل سازی پر مبنی ہو سکتا ہے۔"
        elif risk_level == "low":
            summary_en = "The scanned content does not exhibit known phishing indicators or malicious signatures."
            summary_ur = "اس مواد میں کسی معروف فشنگ، دھوکہ دہی یا سیکیورٹی خطرے کی علامات نہیں پائی گئیں۔"

        if message_finding:
            if message_finding.credential_harvesting_detected:
                recs_en.insert(0, f"Immediately contact your bank to freeze accounts; contact SBP helpline at {SBP_HELPLINE} for complaint escalation if unresolved.")
                recs_ur.insert(0, f"اکاؤنٹ فوری منجمد کروانے کے لیے اپنے متعلقہ بینک کے سرکاری ہیلپ لائن نمبر پر رابطہ کریں۔ شکایت کے ازالے یا تنازع کی صورت میں اسٹیٹ بینک (SBP) کی ہیلپ لائن {SBP_HELPLINE} پر رجوع کریں۔")
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
