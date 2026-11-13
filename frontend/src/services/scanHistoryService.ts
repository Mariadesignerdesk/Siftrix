import type { ScanResponse, ScanTargetType, ScanVerdict, ScanRiskLevel } from './api'

export const REALISTIC_MOCK_SCANS: ScanResponse[] = [
  {
    id: 'sfx_mock_001_url_phish',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://security-verify-chase.online/login/auth?session=92019',
    target_content_preview: 'security-verify-chase.online/login/auth',
    overall_risk_score: 94,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'High-confidence credential harvesting attack impersonating Chase Banking. Domain registered 48 hours ago in Panama with hidden WHOIS records.',
      ur: 'چیس بینک کے نام پر دھوکہ دہی کی غرض سے بنائی گئی جعلی ویب سائٹ۔ ڈومین صرف 48 گھنٹے قبل رجسٹرڈ ہوئی ہے۔',
    },
    recommendations: {
      en: [
        'Block domain across perimeter firewall and DNS resolvers.',
        'Reset bank credentials if input on this host.',
        'Report URL to Google Safe Browsing and APWG.',
      ],
      ur: [
        'فائر وال اور ڈی این ایس پر اس ڈومین کو فوری بلاک کریں۔',
        'اگر پاس ورڈ درج کیا ہے تو فوری تبدیل کریں۔',
      ],
    },
    agent_findings: {
      url_intelligence: {
        domain_age_days: 2,
        registrar: 'NameCheap Privacy Shield',
        tls_valid: true,
        impersonation_target: 'Chase Bank NA',
        asn: 'AS16276 OVH SAS',
        threat_tags: ['credential_harvester', 'brand_impersonation', 'fast_flux'],
      },
      message_intelligence: null,
      security_advisor: {
        priority: 'P1 - Immediate Isolation',
        confidence_rating: 0.98,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'sfx_mock_002_sms_package',
    user_id: 'usr_analyst_demo',
    target_type: 'message',
    target_content: 'USPS Notice: Your parcel delivery #9400100042 has an unpaid $1.85 customs fee. Clear balance here or parcel will be returned: http://usps-redelivery-portal.vip/track',
    target_content_preview: 'USPS Notice: Your parcel delivery #9400100042 has an unpaid $1.85 customs fee...',
    overall_risk_score: 88,
    verdict: 'malicious',
    risk_level: 'high',
    summary: {
      en: 'Classic USPS smishing lure targeting credit card details via low-friction fake customs charge.',
      ur: 'ڈاک پارسل کی جعلی کسٹم فیس کا بہانا بنا کر کریڈٹ کارڈ چرانے کی واردات۔',
    },
    recommendations: {
      en: [
        'Never click tracking links in unsolicited SMS messages.',
        'Verify tracking directly on official USPS.com portal.',
        'Forward spam SMS to 7726 (SPAM).',
      ],
      ur: [
        'غیر تصدیق شدہ ایس ایم ایس لنکس پر کلک مت کریں۔',
        'ایس ایم ایس کو 7726 پر فارورڈ کریں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        sentiment: 'Urgent Payment Demand',
        impersonated_brand: 'United States Postal Service',
        embedded_url: 'http://usps-redelivery-portal.vip/track',
        extracted_phone: '+1 (800) 275-8777 (spoofed)',
      },
      url_intelligence: {
        domain_age_days: 4,
        tld_reputation: 'low (.vip suspicious)',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'sfx_mock_003_email_invoice',
    user_id: 'usr_analyst_demo',
    target_type: 'email',
    target_content: 'Subject: Overdue Tax Invoice #INV-8891 Attached - Swift Payment Required\nFrom: billing@quickbooks-invoicing-direct.cc\nTo: finance@siftrix.internal\n\nDear Accounts, Please find overdue statement of $4,850. Failure to remit by 5pm results in immediate credit freeze. Click here to remit via ACH portal.',
    target_content_preview: 'Subject: Overdue Tax Invoice #INV-8891 Attached - Swift Payment Required...',
    overall_risk_score: 91,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Business Email Compromise (BEC) and fake invoice lure designed to route funds to an unauthorized offshore account.',
      ur: 'کاروباری ای میل فراڈ (BEC) جس میں جعلی انوائس کا مطالبہ کر کے غیر قانونی اکاؤنٹ میں رقم منتقل کروانے کی کوشش کی گئی ہے۔',
    },
    recommendations: {
      en: [
        'Verify invoice authenticity via known telephone numbers.',
        'Flag sender domain *.quickbooks-invoicing-direct.cc in mail gateway.',
        'Quarantine related messages company-wide.',
      ],
      ur: [
        'معلوم فون نمبر پر براہ راست رابطہ کر کے انوائس کی تصدیق کریں۔',
        'کمپنی کے ای میل سرور پر اس ڈومین کو قرنطینہ میں ڈالیں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        financial_risk: 'High ($4,850 fraudulent claim)',
        spf_pass: false,
        dkim_valid: false,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'sfx_mock_004_url_github',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://github.com/torvalds/linux/releases',
    target_content_preview: 'github.com/torvalds/linux/releases',
    overall_risk_score: 4,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Official open source release page hosted on verified GitHub domain. Valid TLS certificate and reputable IP reputation.',
      ur: 'گٹ ہب پر لینکس کا آفیشل اور محفوظ پیج۔ کسی قسم کے وائرس یا مشکوک کوڈ کا کوئی ثبوت نہیں ملا۔',
    },
    recommendations: {
      en: [
        'No defensive action required.',
        'Standard developer safety guidelines apply.',
      ],
      ur: [
        'یہ لنک مکمل طور پر محفوظ ہے۔ کسی کارروائی کی ضرورت نہیں۔',
      ],
    },
    agent_findings: {
      url_intelligence: {
        domain_age_days: 5800,
        registrar: 'MarkMonitor Inc.',
        tls_valid: true,
        reputation: 'Highly Trusted',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'sfx_mock_005_url_shortener',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://bit.ly/3xQ99SecureRedirect',
    target_content_preview: 'bit.ly/3xQ99SecureRedirect',
    overall_risk_score: 62,
    verdict: 'suspicious',
    risk_level: 'medium',
    summary: {
      en: 'URL shortener masking an unvetted secondary redirect destination. Shorteners frequently obscure phishing payloads.',
      ur: 'مختصر کیا گیا پوشیدہ یو آر ایل جو غیر محفوظ سائٹ پر لے جا سکتا ہے۔ احتیاط برتیں۔',
    },
    recommendations: {
      en: [
        'Inspect final unshortened destination before browsing.',
        'Use link expanders or curl with --head flags.',
      ],
      ur: [
        'لنک کھولنے سے پہلے اس کا اصل ویب پتہ چیک کریں۔',
      ],
    },
    agent_findings: {
      url_intelligence: {
        is_shortener: true,
        redirect_depth: 2,
        destination_unverified: true,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
  },
  {
    id: 'sfx_mock_006_email_newsletter',
    user_id: 'usr_analyst_demo',
    target_type: 'email',
    target_content: 'From: news@cybersecurity-weekly.digest\nSubject: Issue #412: Zero-Day Vulnerability Report & Mitigation Guides\n\nHello Security Team, Here is your weekly digest of CVE disclosures and defensive hardening strategies...',
    target_content_preview: 'From: news@cybersecurity-weekly.digest\nSubject: Issue #412: Zero-Day Vulnerability...',
    overall_risk_score: 8,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Benign cybersecurity educational newsletter with verified DKIM signatures and no external obfuscated redirects.',
      ur: 'سائبر سیکیورٹی کا تعلیمی نیوز لیٹر جو مکمل طور پر محفوظ ہے۔',
    },
    recommendations: {
      en: ['Safe to open and distribute to engineering teams.'],
      ur: ['یہ محفوظ ای میل ہے۔'],
    },
    agent_findings: {
      message_intelligence: {
        dmarc_pass: true,
        spam_score: 0.1,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'sfx_mock_007_msg_otp',
    user_id: 'usr_analyst_demo',
    target_type: 'message',
    target_content: 'Alert: Someone requested your SIFTRIX 2FA token. If this was not you, send STOP to 4420 or enter token at http://verify-siftrix-token.com',
    target_content_preview: 'Alert: Someone requested your SIFTRIX 2FA token. If this was not you...',
    overall_risk_score: 95,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Active MFA fatigue / reverse OTP interception attack attempting to steal two-factor authentication tokens.',
      ur: 'ٹو فیکٹر کوڈ چرانے کی خطرناک کوشش۔ کبھی بھی اپنا OTP یا ٹوکن کسی نامعلوم ویب سائٹ پر درج نہ کریں۔',
    },
    recommendations: {
      en: [
        'Never share or type OTP codes on external websites.',
        'Rotate master account credentials immediately.',
        'Review recent active sessions on account settings.',
      ],
      ur: [
        'اپنا OTP کسی سے شیئر نہ کریں۔',
        'اکاؤنٹ کا پاس ورڈ فوراً تبدیل کریں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        threat_type: 'MFA Token Theft',
        urgency: 'Extreme',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  },
  {
    id: 'sfx_mock_008_url_microsoft',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    target_content_preview: 'login.microsoftonline.com/common/oauth2/v2.0/authorize',
    overall_risk_score: 6,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Legitimate Microsoft Entra ID authentication endpoint with valid certificates and Microsoft ASN routing.',
      ur: 'مائیکروسافٹ کا تصدیق شدہ لاگ ان لنک۔',
    },
    recommendations: {
      en: ['Legitimate login endpoint. Confirm OAuth client ID in application bar before submitting credentials.'],
      ur: ['یہ مائیکروسافٹ کا اصل لاگ ان پیج ہے۔'],
    },
    agent_findings: {
      url_intelligence: {
        owner: 'Microsoft Corporation',
        cert_valid: true,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
  {
    id: 'sfx_mock_009_url_paypal_lookalike',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://paypaI-resolution-center.biz/dispute?case=88129',
    target_content_preview: 'paypaI-resolution-center.biz/dispute?case=88129',
    overall_risk_score: 96,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Homograph attack substituting capital "I" for lowercase "l" to spoof PayPal resolution center.',
      ur: 'ہوموگراف حملہ: پی پال کے ہجے میں حرف بدل کر دھوکہ دینے کی کوشش۔',
    },
    recommendations: {
      en: [
        'Notice the deceptive character substitution in the domain name.',
        'Submit blacklist report to Netcraft and PhishTank.',
      ],
      ur: [
        'ڈومین میں جعلی ہجے پر توجہ دیں اور فوری رپورٹ کریں۔',
      ],
    },
    agent_findings: {
      url_intelligence: {
        homoglyph_detected: true,
        impersonated_service: 'PayPal Inc',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 750).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 750).toISOString(),
  },
  {
    id: 'sfx_mock_010_msg_crypto',
    user_id: 'usr_analyst_demo',
    target_type: 'message',
    target_content: 'Congratulations! You received 0.45 BTC in your wallet. Connect your Metamask seed phrase here to claim: https://claim-crypto-airdrop24.io',
    target_content_preview: 'Congratulations! You received 0.45 BTC in your wallet...',
    overall_risk_score: 98,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Cryptocurrency wallet draining scam attempting to steal private seed phrase keys.',
      ur: 'کرپٹو کرنسی والیٹ کو لوٹنے کا فراڈ۔ اپنا سیڈ فریز (Seed Phrase) کبھی درج نہ کریں۔',
    },
    recommendations: {
      en: [
        'Never disclose wallet secret recovery phrases or private keys.',
        'Revoke smart contract permissions using Revoke.cash.',
      ],
      ur: [
        'اپنے والیٹ کے خفیہ کوڈز کبھی بھی کسی ویب سائٹ پر نہ دیں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        attack_vector: 'Seed Phrase Drainer',
        blockchain: 'Bitcoin / Ethereum',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
  },
  {
    id: 'sfx_mock_011_url_cve',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094',
    target_content_preview: 'nvd.nist.gov/vuln/detail/CVE-2024-3094',
    overall_risk_score: 2,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Official US National Institute of Standards and Technology (NIST) vulnerability database.',
      ur: 'قومی ادارے NIST کا مستند سیکیورٹی ڈیٹا بیس۔ مکمل طور پر محفوظ ہے۔',
    },
    recommendations: {
      en: ['Official government reference database. Verified safe.'],
      ur: ['یہ محفوظ سیکیورٹی ڈیٹابیس ہے۔'],
    },
    agent_findings: {
      url_intelligence: {
        institution: 'National Vulnerability Database (NIST)',
        domain_rating: 'A+',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 1100).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1100).toISOString(),
  },
  {
    id: 'sfx_mock_012_email_hr_survey',
    user_id: 'usr_analyst_demo',
    target_type: 'email',
    target_content: 'From: hr-satisfaction@employee-pulse-internal.com\nSubject: Mandatory Q3 Employee Satisfaction Review\n\nPlease complete this mandatory 5-minute survey before Friday.',
    target_content_preview: 'From: hr-satisfaction@employee-pulse-internal.com\nSubject: Mandatory Q3...',
    overall_risk_score: 55,
    verdict: 'suspicious',
    risk_level: 'medium',
    summary: {
      en: 'Lookalike HR domain not registered under corporate DNS. High likelihood of simulated phishing exercise or reconnaissance.',
      ur: 'ایچ آر کے نام پر مشکوک ای میل جو کمپنی کی آفیشل ڈومین سے نہیں بھیجی گئی۔',
    },
    recommendations: {
      en: [
        'Confirm survey legitimacy with internal People Operations via Slack.',
        'Do not input corporate Single Sign-On credentials on third-party pulse tools.',
      ],
      ur: [
        'ایچ آر ڈیپارٹمنٹ سے اس سروے کی تصدیق کریں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        domain_similarity_match: 'internal-corp lookalike',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 1300).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1300).toISOString(),
  },
  {
    id: 'sfx_mock_013_url_cloud_storage',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://storage.googleapis.com/siftrix-sample-bucket/security-whitepaper.pdf',
    target_content_preview: 'storage.googleapis.com/siftrix-sample-bucket/security-whitepaper.pdf',
    overall_risk_score: 12,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Direct PDF download link on Google Cloud Storage. Scanned clean with no executable script tags.',
      ur: 'گوگل کلاؤڈ پر موجود پی ڈی ایف دستاویز جو وائرس سے پاک ہے۔',
    },
    recommendations: {
      en: ['Document scanned clean of active malware macro payloads.'],
      ur: ['یہ فائل محفوظ ہے۔'],
    },
    agent_findings: {
      url_intelligence: {
        cloud_provider: 'Google Cloud Platform',
        mime_type: 'application/pdf',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 1500).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1500).toISOString(),
  },
  {
    id: 'sfx_mock_014_msg_bank_alert',
    user_id: 'usr_analyst_demo',
    target_type: 'message',
    target_content: 'Bank Alert: A debit card charge of $840 at Walmart was declined. If unauthorized, call our automated line immediately: +1 (888) 555-0199',
    target_content_preview: 'Bank Alert: A debit card charge of $840 at Walmart was declined...',
    overall_risk_score: 79,
    verdict: 'suspicious',
    risk_level: 'high',
    summary: {
      en: 'Vishing (voice phishing) precursor designed to induce panic and guide victim into calling a fraudulent call center.',
      ur: 'وائس فریب کاری (Vishing): بینک چارج کے جھوٹے خوف سے صارفین کو جعلی کال سینٹر بلانے کی چال۔',
    },
    recommendations: {
      en: [
        'Call the official phone number printed on the back of your credit/debit card, NOT the SMS number.',
        'Do not provide account numbers or PIN codes over telephone calls.',
      ],
      ur: [
        'اپنے بینک کارڈ کی پشت پر لکھے آفیشل نمبر پر کال کریں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        technique: 'Vishing / Telephony Social Engineering',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 1800).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1800).toISOString(),
  },
  {
    id: 'sfx_mock_015_url_apple_support',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://support.apple.com/en-us/HT201222',
    target_content_preview: 'support.apple.com/en-us/HT201222',
    overall_risk_score: 5,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Official Apple Knowledge Base article covering two-factor authentication configuration for Apple ID.',
      ur: 'ایپل سپورٹ کا تصدیق شدہ آفیشل رہنمائی صفحہ۔',
    },
    recommendations: {
      en: ['Official Apple support documentation. Clean.'],
      ur: ['یہ ایپل کا مستند صفحہ ہے۔'],
    },
    agent_findings: {
      url_intelligence: {
        vendor: 'Apple Inc.',
        reputation: 'Trusted Tier 1',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 2100).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 2100).toISOString(),
  },
  {
    id: 'sfx_mock_016_email_payroll',
    user_id: 'usr_analyst_demo',
    target_type: 'email',
    target_content: 'Subject: Direct Deposit Banking Details Update Request\nFrom: ceo.executive.office@gmail.com\nTo: payroll@siftrix.internal\n\nHi Payroll, I am changing my direct deposit bank. Please switch my routing number to the attached account starting this Friday.',
    target_content_preview: 'Subject: Direct Deposit Banking Details Update Request...',
    overall_risk_score: 92,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Executive impersonation attack sent from free generic Gmail domain targeting payroll rerouting.',
      ur: 'سی ای او کے نام پر جعلی ای میل جس کا مقصد تنخواہ کے اکاؤنٹ کو چوری کرنا ہے۔',
    },
    recommendations: {
      en: [
        'Enforce dual-authorization and verbal out-of-band confirmation for all payroll changes.',
        'Flag external emails spoofing executive display names.',
      ],
      ur: [
        'بینک تفصیلات تبدیل کرنے سے پہلے زبانی تصدیق لازمی لیں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        spoofed_authority: 'CEO / Executive',
        free_webmail_provider: true,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 2500).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 2500).toISOString(),
  },
  {
    id: 'sfx_mock_017_url_ip_logger',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'http://grabify.link/track/IMAGE821.jpg',
    target_content_preview: 'grabify.link/track/IMAGE821.jpg',
    overall_risk_score: 78,
    verdict: 'suspicious',
    risk_level: 'high',
    summary: {
      en: 'Known IP logger and reconnaissance tracking link disguised as an image link.',
      ur: 'آئی پی ایڈریس اور لوکیشن ٹریک کرنے والا مشکوک لنک۔',
    },
    recommendations: {
      en: [
        'Do not visit link as it silently logs your external IP, browser fingerprints, and GPS location.',
        'Block grabify.link domain on company network.',
      ],
      ur: [
        'یہ لنک آپ کی لوکیشن ٹریک کر سکتا ہے، اسے مت کھولیں۔',
      ],
    },
    agent_findings: {
      url_intelligence: {
        category: 'IP Logger / Reconnaissance',
        domain_flag: 'grabify tracker',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 3000).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 3000).toISOString(),
  },
  {
    id: 'sfx_mock_018_url_stack_overflow',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array',
    target_content_preview: 'stackoverflow.com/questions/11227809/why-is-processing...',
    overall_risk_score: 3,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Popular Stack Overflow programming knowledge base question on branch prediction.',
      ur: 'اسٹیک اوور فلو کا محفوظ اور مستند پروگرامنگ پیج۔',
    },
    recommendations: {
      en: ['Safe developer resource.'],
      ur: ['یہ محفوظ سورس ہے۔'],
    },
    agent_findings: {
      url_intelligence: {
        site: 'Stack Exchange Network',
        status: 'Safe',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 3500).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 3500).toISOString(),
  },
  {
    id: 'sfx_mock_019_msg_refund',
    user_id: 'usr_analyst_demo',
    target_type: 'message',
    target_content: 'Geek Squad: Auto-renewal of $399.99 for Total Tech Support was successful. To cancel or dispute this transaction, click: http://cancel-subscription-geeks.info',
    target_content_preview: 'Geek Squad: Auto-renewal of $399.99 for Total Tech Support...',
    overall_risk_score: 93,
    verdict: 'malicious',
    risk_level: 'critical',
    summary: {
      en: 'Tech support refund scam designed to lure victims into installing remote desktop software (AnyDesk / TeamViewer).',
      ur: 'ٹیک سپورٹ کے نام پر 400 ڈالر کی جعلی رسید جس کا مقصد کمپیوٹر پر ریموٹ رسائی حاصل کرنا ہے۔',
    },
    recommendations: {
      en: [
        'Do not click cancellation links or install any software requested by caller/sender.',
        'Check bank balance directly to confirm no such charge occurred.',
      ],
      ur: [
        'کوئی بھی ریموٹ سافٹ ویئر کمپیوٹر میں انسٹال مت کریں۔',
      ],
    },
    agent_findings: {
      message_intelligence: {
        scam_family: 'Tech Support Refund Fraud',
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 4000).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 4000).toISOString(),
  },
  {
    id: 'sfx_mock_020_url_owasp',
    user_id: 'usr_analyst_demo',
    target_type: 'url',
    target_content: 'https://owasp.org/www-project-top-ten/',
    target_content_preview: 'owasp.org/www-project-top-ten/',
    overall_risk_score: 1,
    verdict: 'safe',
    risk_level: 'low',
    summary: {
      en: 'Open Web Application Security Project (OWASP) Top 10 Web Application Vulnerabilities baseline reference.',
      ur: 'اوواسپ (OWASP) کا آفیشل سیکیورٹی پیج۔ بالکل محفوظ اور مستند۔',
    },
    recommendations: {
      en: ['Foundational cybersecurity reference standard. Safe.'],
      ur: ['عالمی سیکیورٹی معیار کا محفوظ ریفرنس۔'],
    },
    agent_findings: {
      url_intelligence: {
        organization: 'OWASP Foundation',
        security_score: 100,
      },
    },
    created_at: new Date(Date.now() - 1000 * 60 * 5000).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 5000).toISOString(),
  },
]

const customMockScans: ScanResponse[] = []

export function getMockScanHistory(): ScanResponse[] {
  return [...customMockScans, ...REALISTIC_MOCK_SCANS]
}

export function getMockScanById(id: string): ScanResponse | undefined {
  return (
    customMockScans.find((s) => s.id === id) ||
    REALISTIC_MOCK_SCANS.find((s) => s.id === id)
  )
}

export function addMockScan(scan: ScanResponse): void {
  customMockScans.unshift(scan)
}

export function searchAndFilterMockScans(
  query = '',
  targetType?: ScanTargetType,
  riskLevel?: ScanRiskLevel,
  verdict?: ScanVerdict
): ScanResponse[] {
  const all = getMockScanHistory()
  const cleanQ = query.trim().toLowerCase()

  return all.filter((item) => {
    if (cleanQ) {
      const matchContent = item.target_content.toLowerCase().includes(cleanQ)
      const matchSummaryEn = item.summary?.en?.toLowerCase().includes(cleanQ)
      const matchSummaryUr = item.summary?.ur?.toLowerCase().includes(cleanQ)
      const matchId = item.id.toLowerCase().includes(cleanQ)
      if (!matchContent && !matchSummaryEn && !matchSummaryUr && !matchId) {
        return false
      }
    }

    if (targetType && item.target_type !== targetType) return false
    if (riskLevel && item.risk_level !== riskLevel) return false
    if (verdict && item.verdict !== verdict) return false

    return true
  })
}
