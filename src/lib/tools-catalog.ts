/* =====================================================================
 * Catalogue of extra astrology tools (AstrologyAPI JSON + Vastu).
 * Shared by the server (allow-list of endpoints, input validation) and the UI (forms, labels).
 * A tool = one input form + 1–5 endpoint calls. Every tool can be switched off in
 * Admin → Settings → Free tools → "Tools switched off" (comma-separated slugs).
 * ===================================================================== */

export type ToolInputKind = "birth" | "birth_year" | "name_dob" | "month_place" | "date_place" | "sign" | "vastu_rooms" | "vastu_plan";
export type Opt = { v: string; en: string; hi: string };
export type ToolCall = {
  /** endpoint path; "{p}" is replaced by the chosen option (`param`), "{sign}" by the zodiac sign */
  endpoint: string;
  en: string;
  hi: string;
  host?: "json" | "vastu";
  /** extra body fields */
  extra?: Record<string, unknown>;
  /** time-dependent result → cache for one day only */
  daily?: boolean;
};
export type ToolDef = {
  slug: string;
  group: GroupKey;
  en: string;
  hi: string;
  blurb: string;
  blurbHi: string;
  icon: string;
  input: ToolInputKind;
  calls: ToolCall[];
  /** a select shown above the form whose value fills "{p}" */
  param?: { en: string; hi: string; options: Opt[]; default: string };
  /** responses come back in English only */
  englishOnly?: boolean;
  popular?: boolean;
};

export const GROUPS = {
  dosha: { en: "Dosha check", hi: "दोष जाँच", icon: "flame" },
  remedies: { en: "Remedies", hi: "उपाय", icon: "gem" },
  muhurat: { en: "Muhurat & timing", hi: "मुहूर्त", icon: "clock" },
  dasha: { en: "Dasha periods", hi: "दशा", icon: "orbit" },
  charts: { en: "Charts & strength", hi: "कुंडली चार्ट", icon: "chart" },
  reports: { en: "Life reports", hi: "जीवन रिपोर्ट", icon: "scroll" },
  lalkitab: { en: "Lal Kitab & KP", hi: "लाल किताब और KP", icon: "book" },
  numerology: { en: "Numerology", hi: "अंक ज्योतिष", icon: "hash" },
  horoscope: { en: "Horoscope", hi: "राशिफल", icon: "sun" },
  vastu: { en: "Vastu", hi: "वास्तु", icon: "home" },
  travel: { en: "Astrocartography", hi: "भाग्यशाली स्थान", icon: "globe" },
} as const;
export type GroupKey = keyof typeof GROUPS;

export const PLANETS: Opt[] = [
  { v: "sun", en: "Sun", hi: "सूर्य" }, { v: "moon", en: "Moon", hi: "चंद्र" }, { v: "mars", en: "Mars", hi: "मंगल" },
  { v: "mercury", en: "Mercury", hi: "बुध" }, { v: "jupiter", en: "Jupiter", hi: "गुरु" }, { v: "venus", en: "Venus", hi: "शुक्र" },
  { v: "saturn", en: "Saturn", hi: "शनि" }, { v: "rahu", en: "Rahu", hi: "राहु" }, { v: "ketu", en: "Ketu", hi: "केतु" },
];
const PLANETS7 = PLANETS.slice(0, 7);

const MUHURTAS: Opt[] = [
  { v: "griha_pravesh", en: "Griha pravesh (house warming)", hi: "गृह प्रवेश" },
  { v: "marriage", en: "Marriage", hi: "विवाह" },
  { v: "vehicle_purchase", en: "Vehicle purchase", hi: "वाहन ख़रीद" },
  { v: "property_purchase", en: "Property purchase", hi: "संपत्ति ख़रीद" },
  { v: "gold_purchase", en: "Gold purchase", hi: "सोना ख़रीद" },
  { v: "bhumi_pujan", en: "Bhumi pujan", hi: "भूमि पूजन" },
  { v: "business_start", en: "Start a business", hi: "व्यापार आरंभ" },
  { v: "job_joining", en: "Job joining", hi: "नौकरी जॉइन" },
  { v: "travel", en: "Travel", hi: "यात्रा" },
  { v: "agreement_signing", en: "Agreement signing", hi: "अनुबंध हस्ताक्षर" },
  { v: "account_opening", en: "Bank account opening", hi: "खाता खोलना" },
  { v: "loan_take", en: "Taking a loan", hi: "ऋण लेना" },
  { v: "loan_give", en: "Giving a loan", hi: "ऋण देना" },
  { v: "namkaran", en: "Namkaran (naming)", hi: "नामकरण" },
  { v: "mundan", en: "Mundan", hi: "मुंडन" },
  { v: "annaprashan", en: "Annaprashan", hi: "अन्नप्राशन" },
  { v: "vidyarambh", en: "Vidyarambh (start of studies)", hi: "विद्यारंभ" },
  { v: "upanayana", en: "Upanayana (janeu)", hi: "उपनयन (जनेऊ)" },
];

const YOGAS: Opt[] = [
  { v: "sarvartha_siddhi", en: "Sarvartha Siddhi yoga", hi: "सर्वार्थ सिद्धि योग" },
  { v: "amrit_siddhi", en: "Amrit Siddhi yoga", hi: "अमृत सिद्धि योग" },
  { v: "guru_pushya", en: "Guru Pushya", hi: "गुरु पुष्य" },
  { v: "ravi_pushya", en: "Ravi Pushya", hi: "रवि पुष्य" },
  { v: "ravi_yoga", en: "Ravi yoga", hi: "रवि योग" },
  { v: "dwipushkar", en: "Dwipushkar yoga", hi: "द्विपुष्कर योग" },
  { v: "tripushkar", en: "Tripushkar yoga", hi: "त्रिपुष्कर योग" },
];

const CHARTS: Opt[] = [
  { v: "D1", en: "D1 · Lagna (birth chart)", hi: "D1 · लग्न कुंडली" }, { v: "D9", en: "D9 · Navamsa (marriage)", hi: "D9 · नवांश (विवाह)" },
  { v: "D10", en: "D10 · Dashamsa (career)", hi: "D10 · दशमांश (करियर)" }, { v: "D2", en: "D2 · Hora (wealth)", hi: "D2 · होरा (धन)" },
  { v: "D3", en: "D3 · Drekkana (siblings)", hi: "D3 · द्रेष्काण (भाई-बहन)" }, { v: "D4", en: "D4 · Chaturthamsa (property)", hi: "D4 · चतुर्थांश (संपत्ति)" },
  { v: "D7", en: "D7 · Saptamsa (children)", hi: "D7 · सप्तमांश (संतान)" }, { v: "D12", en: "D12 · Dwadasamsa (parents)", hi: "D12 · द्वादशांश (माता-पिता)" },
  { v: "D16", en: "D16 · Shodasamsa (vehicles)", hi: "D16 · षोडशांश (वाहन)" }, { v: "D20", en: "D20 · Vimsamsa (spiritual)", hi: "D20 · विंशांश (आध्यात्म)" },
  { v: "D24", en: "D24 · Chaturvimsamsa (education)", hi: "D24 · चतुर्विंशांश (शिक्षा)" }, { v: "D30", en: "D30 · Trimsamsa (troubles)", hi: "D30 · त्रिंशांश (कष्ट)" },
  { v: "D60", en: "D60 · Shashtiamsa (past karma)", hi: "D60 · षष्ट्यंश (पूर्व कर्म)" }, { v: "MOON", en: "Chandra (Moon) chart", hi: "चंद्र कुंडली" },
  { v: "SUN", en: "Surya (Sun) chart", hi: "सूर्य कुंडली" }, { v: "chalit", en: "Chalit chart", hi: "चलित कुंडली" },
];

const ACG_CATEGORIES: Opt[] = [
  { v: "CAREER", en: "Career", hi: "करियर" }, { v: "MONEY", en: "Money", hi: "पैसा" }, { v: "LOVE", en: "Love", hi: "प्रेम" },
  { v: "RELATIONSHIP", en: "Marriage & relationship", hi: "विवाह व रिश्ते" }, { v: "HEALTH", en: "Health", hi: "स्वास्थ्य" },
  { v: "SUCCESS", en: "Success", hi: "सफलता" }, { v: "WEALTH", en: "Wealth", hi: "संपत्ति" }, { v: "TRAVEL", en: "Travel", hi: "यात्रा" },
  { v: "LEARNING", en: "Education", hi: "शिक्षा" }, { v: "SPIRITUALITY", en: "Spirituality", hi: "आध्यात्म" },
  { v: "CREATIVITY", en: "Creativity", hi: "रचनात्मकता" }, { v: "VITALITY", en: "Energy & vitality", hi: "ऊर्जा" },
  { v: "POWER", en: "Power & fame", hi: "शक्ति व प्रसिद्धि" }, { v: "COMMUNICATION", en: "Communication", hi: "संवाद" },
  { v: "ADVENTURE", en: "Adventure", hi: "रोमांच" }, { v: "TRANSFORMATION", en: "Transformation", hi: "परिवर्तन" },
];

const ACG_OPTIONS = { size: 1000, theme: "classic_light", view: "world", labels: "all", output: "json", include_meta: true, show: { land: true, graticule: true, legend: true, zenith: true, ranked_list: true, birth_place: true, stamp: false } };

export const TOOLS: ToolDef[] = [
  /* ---------- Dosha ---------- */
  { slug: "manglik-dosha", group: "dosha", en: "Manglik Dosha", hi: "मांगलिक दोष", icon: "flame", input: "birth", popular: true,
    blurb: "Is Mars causing Manglik dosha in your chart? Percentage, reasons and remedies.", blurbHi: "क्या आपकी कुंडली में मंगल दोष है? प्रतिशत, कारण और उपाय।",
    calls: [{ endpoint: "manglik", en: "Manglik analysis", hi: "मांगलिक विश्लेषण" }] },
  { slug: "kaal-sarp-dosha", group: "dosha", en: "Kaal Sarp Dosha", hi: "काल सर्प दोष", icon: "flame", input: "birth", popular: true,
    blurb: "Check whether all planets sit between Rahu and Ketu — type, effects and remedies.", blurbHi: "क्या सभी ग्रह राहु-केतु के बीच हैं? प्रकार, प्रभाव और उपाय।",
    calls: [{ endpoint: "kalsarpa_details", en: "Kaal Sarp details", hi: "काल सर्प विवरण" }] },
  { slug: "sade-sati", group: "dosha", en: "Shani Sade Sati", hi: "शनि साढ़े साती", icon: "orbit", input: "birth", popular: true,
    blurb: "Are you in Sade Sati now? Current status and every Sade Sati phase of your life.", blurbHi: "क्या अभी साढ़े साती चल रही है? वर्तमान स्थिति और जीवन भर की साढ़े साती।",
    calls: [{ endpoint: "sadhesati_current_status", en: "Current status", hi: "वर्तमान स्थिति", daily: true }, { endpoint: "sadhesati_life_details", en: "Sade Sati in your life", hi: "जीवन में साढ़े साती" }] },
  { slug: "pitra-dosha", group: "dosha", en: "Pitra Dosha", hi: "पितृ दोष", icon: "flame", input: "birth",
    blurb: "Ancestral (Pitra) dosha check with its effects and remedies.", blurbHi: "पितृ दोष की जाँच, प्रभाव और उपाय।",
    calls: [{ endpoint: "pitra_dosha_report", en: "Pitra dosha report", hi: "पितृ दोष रिपोर्ट" }] },

  /* ---------- Remedies ---------- */
  { slug: "gemstone-suggestion", group: "remedies", en: "Lucky Gemstone", hi: "भाग्यशाली रत्न", icon: "gem", input: "birth", popular: true,
    blurb: "Your life stone, lucky stone and benefic stone — with metal, finger and day to wear.", blurbHi: "आपका जीवन रत्न, भाग्य रत्न — कौन सी धातु, उंगली और दिन पहनें।",
    calls: [{ endpoint: "basic_gem_suggestion", en: "Gemstone suggestion", hi: "रत्न सुझाव" }] },
  { slug: "rudraksha-suggestion", group: "remedies", en: "Rudraksha", hi: "रुद्राक्ष", icon: "gem", input: "birth",
    blurb: "Which Rudraksha suits you, and why.", blurbHi: "आपके लिए कौन सा रुद्राक्ष शुभ है।",
    calls: [{ endpoint: "rudraksha_suggestion", en: "Rudraksha suggestion", hi: "रुद्राक्ष सुझाव" }] },
  { slug: "puja-suggestion", group: "remedies", en: "Puja Suggestion", hi: "पूजा सुझाव", icon: "sparkles", input: "birth",
    blurb: "Pujas recommended for your chart.", blurbHi: "आपकी कुंडली के अनुसार पूजा।",
    calls: [{ endpoint: "puja_suggestion", en: "Puja suggestion", hi: "पूजा सुझाव" }] },
  { slug: "sade-sati-remedies", group: "remedies", en: "Sade Sati Remedies", hi: "साढ़े साती उपाय", icon: "sparkles", input: "birth",
    blurb: "Remedies to reduce the effects of Shani's Sade Sati.", blurbHi: "शनि की साढ़े साती के प्रभाव कम करने के उपाय।",
    calls: [{ endpoint: "sadhesati_remedies", en: "Remedies", hi: "उपाय" }] },
  { slug: "lal-kitab-remedies", group: "remedies", en: "Lal Kitab Remedies", hi: "लाल किताब उपाय", icon: "book", input: "birth",
    blurb: "Simple Lal Kitab totke for any planet in your chart.", blurbHi: "आपकी कुंडली के किसी भी ग्रह के लिए लाल किताब के उपाय।",
    param: { en: "Planet", hi: "ग्रह", options: PLANETS, default: "saturn" },
    calls: [{ endpoint: "lalkitab_remedies/{p}", en: "Lal Kitab remedies", hi: "लाल किताब उपाय" }] },

  /* ---------- Muhurat & timing ---------- */
  { slug: "shubh-muhurat", group: "muhurat", en: "Shubh Muhurat Finder", hi: "शुभ मुहूर्त", icon: "calendar", input: "month_place", popular: true,
    blurb: "Auspicious dates and times in any month — griha pravesh, marriage, vehicle, property and more.", blurbHi: "किसी भी महीने के शुभ दिन और समय — गृह प्रवेश, विवाह, वाहन, संपत्ति आदि।",
    param: { en: "Muhurat for", hi: "किस काम का मुहूर्त", options: MUHURTAS, default: "griha_pravesh" },
    calls: [{ endpoint: "monthly_muhurta/{p}", en: "Auspicious dates", hi: "शुभ तिथियाँ" }] },
  { slug: "auspicious-yogas", group: "muhurat", en: "Siddhi & Pushya Yogas", hi: "सिद्धि और पुष्य योग", icon: "sparkles", input: "month_place",
    blurb: "Sarvartha Siddhi, Amrit Siddhi, Guru/Ravi Pushya and Pushkar yogas of the month.", blurbHi: "महीने के सर्वार्थ सिद्धि, अमृत सिद्धि, गुरु/रवि पुष्य और पुष्कर योग।",
    param: { en: "Yoga", hi: "योग", options: YOGAS, default: "sarvartha_siddhi" },
    calls: [{ endpoint: "monthly-panchang-yogas/{p}", en: "Yoga dates", hi: "योग की तिथियाँ" }] },
  { slug: "choghadiya", group: "muhurat", en: "Choghadiya", hi: "चौघड़िया", icon: "clock", input: "date_place", popular: true,
    blurb: "Day and night Choghadiya — Amrit, Shubh, Labh, Char and the ones to avoid.", blurbHi: "दिन और रात का चौघड़िया — अमृत, शुभ, लाभ, चर और किनसे बचें।",
    calls: [{ endpoint: "chaughadiya_muhurta", en: "Choghadiya", hi: "चौघड़िया" }] },
  { slug: "hora", group: "muhurat", en: "Hora Muhurat", hi: "होरा मुहूर्त", icon: "clock", input: "date_place",
    blurb: "Planetary hours of the day — pick the right hour for each kind of work.", blurbHi: "दिन के ग्रह-होरा — हर काम के लिए सही घंटा।",
    calls: [{ endpoint: "hora_muhurta", en: "Hora", hi: "होरा" }] },
  { slug: "festivals", group: "muhurat", en: "Festivals & Vrat", hi: "त्योहार और व्रत", icon: "calendar", input: "date_place",
    blurb: "Festivals and fasts around a date.", blurbHi: "किसी तारीख़ के त्योहार और व्रत।",
    calls: [{ endpoint: "festivals-by-date", en: "Festivals", hi: "त्योहार" }] },

  /* ---------- Dasha ---------- */
  { slug: "vimshottari-dasha", group: "dasha", en: "Vimshottari Dasha", hi: "विंशोत्तरी दशा", icon: "orbit", input: "birth", popular: true,
    blurb: "Your current Mahadasha, Antardasha and Pratyantar — and every major period of life.", blurbHi: "वर्तमान महादशा, अंतर्दशा, प्रत्यंतर — और जीवन की सभी महादशाएँ।",
    calls: [{ endpoint: "current_vdasha", en: "Running dasha", hi: "चल रही दशा", daily: true }, { endpoint: "major_vdasha", en: "All Mahadashas", hi: "सभी महादशाएँ" }] },
  { slug: "yogini-dasha", group: "dasha", en: "Yogini Dasha", hi: "योगिनी दशा", icon: "orbit", input: "birth",
    blurb: "Current and major Yogini dasha periods.", blurbHi: "वर्तमान और मुख्य योगिनी दशा।",
    calls: [{ endpoint: "current_yogini_dasha", en: "Running Yogini dasha", hi: "चल रही योगिनी दशा", daily: true }, { endpoint: "major_yogini_dasha", en: "Major periods", hi: "मुख्य दशाएँ" }] },
  { slug: "char-dasha", group: "dasha", en: "Char Dasha (Jaimini)", hi: "चर दशा (जैमिनी)", icon: "orbit", input: "birth", englishOnly: true,
    blurb: "Jaimini Char dasha — sign-based periods.", blurbHi: "जैमिनी चर दशा — राशि आधारित दशा।",
    calls: [{ endpoint: "current_chardasha", en: "Running Char dasha", hi: "चल रही चर दशा", daily: true }, { endpoint: "major_chardasha", en: "Major periods", hi: "मुख्य दशाएँ" }] },
  { slug: "varshaphal", group: "dasha", en: "Varshaphal (Yearly)", hi: "वर्षफल", icon: "calendar", input: "birth_year",
    blurb: "Your solar-return year: year lord, Muntha and highlights for the chosen year.", blurbHi: "चुने हुए वर्ष का वर्षफल: वर्षेश, मुंथा और मुख्य बातें।",
    calls: [{ endpoint: "varshaphal_details", en: "Varshaphal details", hi: "वर्षफल विवरण" }, { endpoint: "varshaphal_muntha", en: "Muntha", hi: "मुंथा" }] },

  /* ---------- Charts & strength ---------- */
  { slug: "divisional-charts", group: "charts", en: "Divisional Charts (D1–D60)", hi: "वर्ग कुंडली (D1–D60)", icon: "chart", input: "birth", popular: true,
    blurb: "Lagna, Navamsa, Dashamsa and every divisional chart, North-Indian style.", blurbHi: "लग्न, नवांश, दशमांश और सभी वर्ग कुंडलियाँ।",
    param: { en: "Chart", hi: "कुंडली", options: CHARTS, default: "D9" },
    calls: [{ endpoint: "horo_chart_image/{p}", en: "Chart", hi: "कुंडली", extra: { chartType: "north", image_type: "svg" } }] },
  { slug: "ashtakvarga", group: "charts", en: "Sarvashtakavarga", hi: "सर्वाष्टकवर्ग", icon: "chart", input: "birth",
    blurb: "Bindu points of every sign — which houses are strong in your chart.", blurbHi: "हर राशि के बिंदु — कौन से भाव मज़बूत हैं।",
    calls: [{ endpoint: "sarvashtak", en: "Sarvashtakavarga", hi: "सर्वाष्टकवर्ग" }] },
  { slug: "planet-ashtakvarga", group: "charts", en: "Planet Ashtakavarga", hi: "ग्रह अष्टकवर्ग", icon: "chart", input: "birth",
    blurb: "Ashtakavarga points of one planet.", blurbHi: "किसी एक ग्रह का अष्टकवर्ग।",
    param: { en: "Planet", hi: "ग्रह", options: PLANETS7, default: "saturn" },
    calls: [{ endpoint: "planet_ashtak/{p}", en: "Ashtakavarga", hi: "अष्टकवर्ग" }] },
  { slug: "planet-strength", group: "charts", en: "Planet Strength (Shadbala)", hi: "ग्रह बल (षड्बल)", icon: "chart", input: "birth", englishOnly: true,
    blurb: "Six-fold strength of each planet and house strength (Bhavabala).", blurbHi: "हर ग्रह का षड्बल और भाव बल।",
    calls: [{ endpoint: "shadbala", en: "Shadbala", hi: "षड्बल" }, { endpoint: "bhavabala", en: "Bhavabala", hi: "भाव बल" }] },
  { slug: "jaimini", group: "charts", en: "Jaimini Karakas", hi: "जैमिनी कारक", icon: "chart", input: "birth", englishOnly: true,
    blurb: "Atmakaraka, Amatyakaraka and other Jaimini indicators.", blurbHi: "आत्मकारक, अमात्यकारक आदि जैमिनी कारक।",
    calls: [{ endpoint: "jaimini_details", en: "Jaimini details", hi: "जैमिनी विवरण" }] },
  { slug: "ghat-chakra", group: "charts", en: "Ghat Chakra", hi: "घात चक्र", icon: "chart", input: "birth",
    blurb: "Your inauspicious month, tithi, day and nakshatra (Ghat chakra).", blurbHi: "आपके लिए अशुभ मास, तिथि, वार और नक्षत्र।",
    calls: [{ endpoint: "ghat_chakra", en: "Ghat chakra", hi: "घात चक्र" }] },
  { slug: "biorhythm", group: "charts", en: "Biorhythm", hi: "बायोरिदम", icon: "heart", input: "birth", englishOnly: true,
    blurb: "Physical, emotional and intellectual cycles for today.", blurbHi: "आज के शारीरिक, भावनात्मक और बौद्धिक चक्र।",
    calls: [{ endpoint: "biorhythm", en: "Biorhythm", hi: "बायोरिदम", daily: true }] },

  /* ---------- Life reports ---------- */
  { slug: "ascendant-report", group: "reports", en: "Lagna (Ascendant) Report", hi: "लग्न रिपोर्ट", icon: "scroll", input: "birth", popular: true,
    blurb: "Your personality, temperament and life approach from your Lagna.", blurbHi: "लग्न से आपका व्यक्तित्व, स्वभाव और जीवन दृष्टि।",
    calls: [{ endpoint: "general_ascendant_report", en: "Ascendant report", hi: "लग्न रिपोर्ट" }] },
  { slug: "nakshatra-report", group: "reports", en: "Birth Nakshatra Report", hi: "जन्म नक्षत्र रिपोर्ट", icon: "star", input: "birth",
    blurb: "Personality, education, career, health and family as per your birth nakshatra.", blurbHi: "जन्म नक्षत्र के अनुसार व्यक्तित्व, शिक्षा, करियर, स्वास्थ्य।",
    calls: [{ endpoint: "general_nakshatra_report", en: "Nakshatra report", hi: "नक्षत्र रिपोर्ट" }] },
  { slug: "planet-in-house", group: "reports", en: "Planet in House", hi: "भाव में ग्रह", icon: "scroll", input: "birth",
    blurb: "What a planet's house placement means for you.", blurbHi: "किसी ग्रह की भाव स्थिति का आप पर प्रभाव।",
    param: { en: "Planet", hi: "ग्रह", options: PLANETS7, default: "jupiter" },
    calls: [{ endpoint: "general_house_report/{p}", en: "House report", hi: "भाव रिपोर्ट" }] },
  { slug: "planet-in-rashi", group: "reports", en: "Planet in Rashi", hi: "राशि में ग्रह", icon: "scroll", input: "birth",
    blurb: "What a planet's sign placement means for you.", blurbHi: "किसी ग्रह की राशि स्थिति का प्रभाव।",
    param: { en: "Planet", hi: "ग्रह", options: PLANETS7.filter((p) => p.v !== "sun"), default: "moon" },
    calls: [{ endpoint: "general_rashi_report/{p}", en: "Rashi report", hi: "राशि रिपोर्ट" }] },
  { slug: "daily-nakshatra", group: "reports", en: "Today by Your Nakshatra", hi: "नक्षत्र से आज का दिन", icon: "star", input: "birth",
    blurb: "Today's prediction from your Moon nakshatra — health, emotions, career, luck.", blurbHi: "आपके नक्षत्र से आज का फल — स्वास्थ्य, भावना, करियर, भाग्य।",
    calls: [{ endpoint: "daily_nakshatra_prediction", en: "Today", hi: "आज", daily: true }] },

  /* ---------- Lal Kitab & KP ---------- */
  { slug: "lal-kitab", group: "lalkitab", en: "Lal Kitab Kundli", hi: "लाल किताब कुंडली", icon: "book", input: "birth", popular: true,
    blurb: "Lal Kitab chart, planets and karmic debts (Rin).", blurbHi: "लाल किताब कुंडली, ग्रह और ऋण।",
    calls: [{ endpoint: "lalkitab_horoscope", en: "Lal Kitab chart", hi: "लाल किताब कुंडली" }, { endpoint: "lalkitab_debts", en: "Karmic debts (Rin)", hi: "ऋण" }] },
  { slug: "lal-kitab-houses", group: "lalkitab", en: "Lal Kitab Houses", hi: "लाल किताब भाव", icon: "book", input: "birth",
    blurb: "House-wise Lal Kitab analysis.", blurbHi: "भाव अनुसार लाल किताब विश्लेषण।",
    calls: [{ endpoint: "lalkitab_houses", en: "Houses", hi: "भाव" }, { endpoint: "lalkitab_planets", en: "Planets", hi: "ग्रह" }] },
  { slug: "kp-astrology", group: "lalkitab", en: "KP Astrology", hi: "केपी ज्योतिष", icon: "chart", input: "birth", englishOnly: true,
    blurb: "Krishnamurti Paddhati planets and house cusps with sub-lords.", blurbHi: "कृष्णमूर्ति पद्धति — ग्रह और भाव कस्प।",
    calls: [{ endpoint: "kp_planets", en: "KP planets", hi: "KP ग्रह" }, { endpoint: "kp_house_cusps", en: "House cusps", hi: "भाव कस्प" }] },
  { slug: "kp-significators", group: "lalkitab", en: "KP Significators", hi: "केपी कारक", icon: "chart", input: "birth", englishOnly: true,
    blurb: "Planet and house significators (KP).", blurbHi: "ग्रह और भाव कारक (KP)।",
    calls: [{ endpoint: "kp_planet_significator", en: "Planet significators", hi: "ग्रह कारक" }, { endpoint: "kp_house_significator", en: "House significators", hi: "भाव कारक" }] },

  /* ---------- Numerology ---------- */
  { slug: "lucky-numerology", group: "numerology", en: "Lucky Time, God & Mantra", hi: "शुभ समय, देवता व मंत्र", icon: "hash", input: "name_dob",
    blurb: "Your favourable time, deity and mantra by numerology.", blurbHi: "अंक ज्योतिष से शुभ समय, इष्ट देव और मंत्र।",
    calls: [{ endpoint: "numero_fav_time", en: "Favourable time", hi: "शुभ समय" }, { endpoint: "numero_fav_lord", en: "Favourable deity", hi: "इष्ट देव" }, { endpoint: "numero_fav_mantra", en: "Mantra", hi: "मंत्र" }] },
  { slug: "numerology-vastu", group: "numerology", en: "Fasts & Home Vastu by Number", hi: "व्रत और घर (अंक)", icon: "hash", input: "name_dob",
    blurb: "Fasts that suit you and the best house direction by your number.", blurbHi: "आपके अंक के अनुसार व्रत और घर की शुभ दिशा।",
    calls: [{ endpoint: "numero_fasts_report", en: "Fasts", hi: "व्रत" }, { endpoint: "numero_place_vastu", en: "House direction", hi: "घर की दिशा" }] },
  { slug: "numerology-daily", group: "numerology", en: "Daily Number Prediction", hi: "आज का अंक फल", icon: "hash", input: "name_dob",
    blurb: "Today's prediction by your radical number.", blurbHi: "मूलांक से आज का फल।",
    calls: [{ endpoint: "numero_prediction/daily", en: "Today", hi: "आज", daily: true }] },

  /* ---------- Horoscope ---------- */
  { slug: "monthly-horoscope", group: "horoscope", en: "Monthly Rashifal", hi: "मासिक राशिफल", icon: "sun", input: "sign", popular: true,
    blurb: "This month for your zodiac sign.", blurbHi: "आपकी राशि के लिए इस महीने का फल।",
    calls: [{ endpoint: "horoscope_prediction/monthly/{sign}", en: "This month", hi: "इस महीने", daily: true, extra: { timezone: 5.5 } }] },
  { slug: "weekly-horoscope", group: "horoscope", en: "Weekly Rashifal", hi: "साप्ताहिक राशिफल", icon: "sun", input: "sign",
    blurb: "This week for your zodiac sign.", blurbHi: "आपकी राशि के लिए इस सप्ताह का फल।",
    calls: [{ endpoint: "horoscope_prediction/weekly/{sign}", en: "This week", hi: "इस सप्ताह", daily: true, extra: { timezone: 5.5 } }] },

  /* ---------- Vastu ---------- */
  { slug: "vastu-check", group: "vastu", en: "Vastu Check (Rooms)", hi: "वास्तु जाँच (कमरे)", icon: "home", input: "vastu_rooms", popular: true, englishOnly: true,
    blurb: "Tell us your main door and room directions — get a Vastu score, problems and remedies.", blurbHi: "मुख्य द्वार और कमरों की दिशा बताइए — वास्तु स्कोर, दोष और उपाय।",
    calls: [{ endpoint: "basic-score", host: "vastu", en: "Vastu score", hi: "वास्तु स्कोर" }, { endpoint: "basic-findings", host: "vastu", en: "Findings", hi: "दोष" }, { endpoint: "basic-remedies", host: "vastu", en: "Remedies", hi: "उपाय" }] },
  { slug: "vastu-floor-plan", group: "vastu", en: "Vastu from Floor Plan", hi: "नक्शे से वास्तु", icon: "home", input: "vastu_plan", englishOnly: true,
    blurb: "Upload your house map — AI reads every room and gives a full Vastu analysis.", blurbHi: "घर का नक्शा अपलोड करें — हर कमरे का पूरा वास्तु विश्लेषण।",
    calls: [{ endpoint: "score", host: "vastu", en: "Vastu score", hi: "वास्तु स्कोर" }, { endpoint: "findings", host: "vastu", en: "Findings", hi: "दोष" }, { endpoint: "remedies", host: "vastu", en: "Remedies", hi: "उपाय" }, { endpoint: "direction-8", host: "vastu", en: "8 directions", hi: "8 दिशाएँ" }] },

  /* ---------- Astrocartography ---------- */
  { slug: "lucky-places", group: "travel", en: "Lucky Places (World Map)", hi: "भाग्यशाली स्थान", icon: "globe", input: "birth", popular: true, englishOnly: true,
    blurb: "Which cities and countries favour your career, money or love — on a world map.", blurbHi: "कौन से शहर/देश आपके करियर, धन या प्रेम के लिए शुभ हैं — विश्व मानचित्र पर।",
    param: { en: "Life area", hi: "जीवन क्षेत्र", options: ACG_CATEGORIES, default: "CAREER" },
    calls: [{ endpoint: "acg/render/category/{p}", en: "Best places", hi: "शुभ स्थान", extra: { top_n: 6, second: 0, options: ACG_OPTIONS } }] },
  { slug: "planet-lines-map", group: "travel", en: "Planet Lines Map", hi: "ग्रह रेखा मानचित्र", icon: "globe", input: "birth", englishOnly: true,
    blurb: "Where on Earth each planet is strongest for you (astrocartography lines).", blurbHi: "धरती पर कहाँ कौन सा ग्रह आपके लिए सबसे प्रबल है।",
    calls: [{ endpoint: "acg/render/map", en: "World map", hi: "विश्व मानचित्र", extra: { second: 0, options: { ...ACG_OPTIONS, planets: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"], lines: ["mc", "ic", "asc", "dsc"] } } }] },
];

export const VASTU_DIRECTIONS: Opt[] = [
  { v: "N", en: "North", hi: "उत्तर" }, { v: "NE", en: "North-East", hi: "ईशान (उत्तर-पूर्व)" }, { v: "E", en: "East", hi: "पूर्व" },
  { v: "SE", en: "South-East", hi: "आग्नेय (दक्षिण-पूर्व)" }, { v: "S", en: "South", hi: "दक्षिण" }, { v: "SW", en: "South-West", hi: "नैऋत्य (दक्षिण-पश्चिम)" },
  { v: "W", en: "West", hi: "पश्चिम" }, { v: "NW", en: "North-West", hi: "वायव्य (उत्तर-पश्चिम)" },
];
export const VASTU_ROOMS: Opt[] = [
  { v: "kitchen", en: "Kitchen", hi: "रसोई" },
  { v: "master_bedroom", en: "Master bedroom", hi: "मुख्य शयनकक्ष" },
  { v: "bedroom", en: "Bedroom", hi: "शयनकक्ष" },
  { v: "kids_bedroom", en: "Children's bedroom", hi: "बच्चों का कमरा" },
  { v: "guest_bedroom", en: "Guest bedroom", hi: "अतिथि कक्ष" },
  { v: "puja_room", en: "Puja room", hi: "पूजा घर" },
  { v: "living_room", en: "Living room", hi: "बैठक" },
  { v: "dining_room", en: "Dining", hi: "भोजन कक्ष" },
  { v: "toilet", en: "Toilet", hi: "शौचालय" },
  { v: "bathroom", en: "Bathroom", hi: "स्नानघर" },
  { v: "powder_room", en: "Powder room", hi: "पाउडर रूम" },
  { v: "study", en: "Study", hi: "अध्ययन कक्ष" },
  { v: "office", en: "Office", hi: "ऑफ़िस" },
  { v: "staircase", en: "Staircase", hi: "सीढ़ी" },
  { v: "storage", en: "Store room", hi: "भंडार" },
  { v: "granary", en: "Granary", hi: "अनाज भंडार" },
  { v: "treasury", en: "Locker / cash", hi: "तिजोरी" },
  { v: "pantry", en: "Pantry", hi: "पेंट्री" },
  { v: "laundry", en: "Laundry", hi: "कपड़े धोने की जगह" },
  { v: "foyer", en: "Foyer / entrance hall", hi: "प्रवेश कक्ष" },
  { v: "servant_room", en: "Servant room", hi: "सेवक कक्ष" },
  { v: "gym", en: "Gym", hi: "जिम" },
  { v: "home_theatre", en: "Home theatre", hi: "होम थिएटर" },
  { v: "lift", en: "Lift", hi: "लिफ्ट" },
  { v: "parking", en: "Parking", hi: "पार्किंग" },
  { v: "balcony", en: "Balcony", hi: "बालकनी" },
  { v: "verandah", en: "Verandah", hi: "बरामदा" },
  { v: "terrace", en: "Terrace", hi: "छत" },
  { v: "garden", en: "Garden", hi: "बगीचा" },
  { v: "courtyard", en: "Courtyard", hi: "आँगन" },
  { v: "pool", en: "Swimming pool", hi: "स्विमिंग पूल" },
];

export const VASTU_CONCERNS: Opt[] = [
  { v: "NONE", en: "Just a general check", hi: "सामान्य जाँच" }, { v: "MONEY", en: "Money", hi: "धन" }, { v: "HEALTH", en: "Health", hi: "स्वास्थ्य" },
  { v: "WORK", en: "Work / career", hi: "काम / करियर" }, { v: "HOME", en: "Family & home peace", hi: "घर की शांति" }, { v: "MOOD", en: "Mood & sleep", hi: "मन व नींद" },
];
export const VASTU_AGENCY: Opt[] = [
  { v: "OWN_CAN_REBUILD", en: "I own it, can rebuild", hi: "अपना घर, बदलाव संभव" }, { v: "OWN_CANNOT_REBUILD", en: "I own it, can't rebuild", hi: "अपना घर, तोड़-फोड़ नहीं" },
  { v: "RENT", en: "Rented", hi: "किराये का" }, { v: "UNKNOWN", en: "Not sure", hi: "पता नहीं" },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug) || null;
export const toolsOff = (setting: string | undefined) => new Set((setting || "").split(/[\s,]+/).map((x) => x.trim()).filter(Boolean));

export const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
