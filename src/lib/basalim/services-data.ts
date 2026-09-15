export type BilingualLine = { en: string; ar: string };

export type ServiceStat = { valueEn: string; labelEn: string; labelAr: string };

export type ServicePageConfig = {
  slug: string;
  hero: BilingualLine & { subtitleEn?: string; subtitleAr?: string };
  items?: BilingualLine[];
  outcomes?: BilingualLine[];
  processSteps?: BilingualLine[];
  processTagline?: BilingualLine;
  quote?: BilingualLine;
  journeyHeadline?: BilingualLine;
  journeySteps?: BilingualLine[];
  journeyTagline?: BilingualLine;
  numberedSteps?: BilingualLine[];
  positioning?: BilingualLine;
  positioningSub?: BilingualLine;
  stats?: ServiceStat[];
  statCards?: ServiceStat[];
  cta: BilingualLine & { buttonEn: string; buttonAr: string };
};

export const SERVICES_OVERVIEW_CARDS: Array<
  ServicePageConfig & { bullets: BilingualLine[]; icon: string }
> = [
  {
    slug: "organizational-development",
    icon: "building",
    hero: {
      en: "Organizational Development",
      ar: "التطوير التنظيمي",
      subtitleEn: "Structure, roles, performance and people systems that scale.",
      subtitleAr: "بناء الهياكل وأنظمة الأداء التي تدعم النمو.",
    },
    bullets: [
      { en: "Organization structure design", ar: "تصميم الهيكل التنظيمي" },
      { en: "Performance management systems", ar: "أنظمة إدارة الأداء" },
      { en: "Culture & engagement", ar: "الثقافة ومشاركة الموظفين" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "talent-acquisition",
    icon: "search",
    hero: {
      en: "Talent Acquisition & Recruitment",
      ar: "التوظيف والاستقطاب",
      subtitleEn: "Find and secure the right people faster.",
      subtitleAr: "من البحث حتى التعيين الناجح.",
    },
    bullets: [
      { en: "Executive search & professional recruitment", ar: "البحث التنفيذي والتوظيف المهني" },
      { en: "Saudi talent acquisition", ar: "استقطاب الكوادر السعودية" },
      { en: "Assessment & onboarding support", ar: "التقييم ودعم الإعداد الوظيفي" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "learning-development",
    icon: "book",
    hero: {
      en: "Learning & Development",
      ar: "التعلم والتطوير",
      subtitleEn: "Training journeys that build real capability.",
      subtitleAr: "برامج تطوير تبني قدرات حقيقية.",
    },
    bullets: [
      { en: "Training needs analysis & annual plans", ar: "تحليل احتياجات التدريب والخطط السنوية" },
      { en: "Leadership & management development", ar: "تطوير القيادات والإدارة" },
      { en: "Coaching, mentoring & academies", ar: "التدريب والإرشاد والأكاديميات" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "leadership-development",
    icon: "crown",
    hero: {
      en: "Leadership Development",
      ar: "تطوير القيادات",
      subtitleEn: "Develop the leaders your organization needs.",
      subtitleAr: "صناع التميز يبدأون من هنا.",
    },
    bullets: [
      { en: "Emerging & future leaders programs", ar: "برامج القادة الناشئين والمستقبل" },
      { en: "Executive leadership & coaching", ar: "القيادة التنفيذية والتدريب" },
      { en: "Succession & high-potential development", ar: "التخطيط للخلافة وتطوير الإمكانات" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "hospitality-tourism",
    icon: "hotel",
    hero: {
      en: "Hospitality & Tourism Solutions",
      ar: "حلول الضيافة والسياحة",
      subtitleEn: "Specialized people expertise for hospitality.",
      subtitleAr: "خبرة متخصصة في قطاع الضيافة.",
    },
    bullets: [
      { en: "Pre-opening HR & mass recruitment", ar: "دعم ما قبل الافتتاح والتوظيف الجماعي" },
      { en: "Saudization & service culture", ar: "السعودة وثقافة الخدمة" },
      { en: "Operational readiness", ar: "الاستعداد التشغيلي" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "people-function",
    icon: "layers",
    hero: {
      en: "Build Your People Function",
      ar: "بناء وظيفة الموارد البشرية",
      subtitleEn: "HR foundation from strategy to systems.",
      subtitleAr: "من الأساس إلى التميز.",
    },
    bullets: [
      { en: "Organization & workforce design", ar: "تصميم المنظمة والقوى العاملة" },
      { en: "Recruitment through performance", ar: "من التوظيف إلى إدارة الأداء" },
      { en: "HR governance & metrics", ar: "حوكمة الموارد البشرية والمقاييس" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
  {
    slug: "hr-advisory",
    icon: "briefcase",
    hero: {
      en: "HR Advisory & People Partner",
      ar: "الاستشارات الاستراتيجية للموارد البشرية",
      subtitleEn: "Expert HR guidance for growing organizations.",
      subtitleAr: "إرشاد متخصص في الموارد البشرية.",
    },
    bullets: [
      { en: "HR strategy & governance", ar: "استراتيجية الموارد البشرية والحوكمة" },
      { en: "Saudi labor compliance & Saudization", ar: "الامتثال لنظام العمل والسعودة" },
      { en: "Fractional HR director support", ar: "مدير موارد بشرية جزئي" },
    ],
    cta: { en: "", ar: "", buttonEn: "Explore Service", buttonAr: "استكشف الخدمة" },
  },
];

export const SERVICE_PAGES: Record<string, ServicePageConfig> = {
  "organizational-development": {
    slug: "organizational-development",
    hero: {
      en: "Stronger Organizations.\nBrighter People.",
      ar: "التطوير التنظيمي — من استراتيجية\nوالصحة إلى أثر حقيقي",
      subtitleEn: "We design people-centered strategies, structures and cultures that drive performance.",
      subtitleAr: "نصمم الهياكل التنظيمية وأنظمة الأفراد التي تدفع الأداء",
    },
    items: [
      { en: "Organization Structure Design", ar: "تصميم الهيكل التنظيمي" },
      { en: "Workforce Planning", ar: "تخطيط القوى العاملة" },
      { en: "Job Architecture & Job Descriptions", ar: "بنية الوظائف والأوصاف الوظيفية" },
      { en: "Competency Frameworks", ar: "أطر الكفاءات" },
      { en: "Performance Management Systems", ar: "أنظمة إدارة الأداء" },
      { en: "Career Paths & Succession Planning", ar: "مسارات المهنة والتخطيط للخلافة" },
      { en: "Culture & Employee Engagement", ar: "الثقافة ومشاركة الموظفين" },
      { en: "Salary & Grading Structures", ar: "هياكل الرواتب والدرجات" },
      { en: "HR Transformation", ar: "تحويل الموارد البشرية" },
    ],
    outcomes: [
      { en: "Build a structure that scales", ar: "بناء هيكل يواكب النمو" },
      { en: "Drive performance at every level", ar: "دفع الأداء على كل المستويات" },
      { en: "Create a culture that lasts", ar: "خلق ثقافة تدوم" },
    ],
    statCards: [
      { valueEn: "2,000+", labelEn: "Professionals touched", labelAr: "محترف تم التعامل معهم" },
      { valueEn: "52%", labelEn: "Performance improvement avg", labelAr: "متوسط تحسن الأداء" },
    ],
    cta: {
      en: "Let's Discuss Your Needs",
      ar: "لنناقش احتياجاتك",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "talent-acquisition": {
    slug: "talent-acquisition",
    hero: {
      en: "The Right People.\nA Stronger Tomorrow.",
      ar: "التوظيف والاستقطاب —\nنصل إلى أفضل الكفاءات",
      subtitleEn:
        "We help you attract, assess and hire the talent that fits the role and drives your business forward.",
      subtitleAr: "نساعدك على استقطاب وتقييم وتوظيف المواهب المناسبة التي تدفع أعمالك للأمام",
    },
    stats: [
      { valueEn: "1,000+", labelEn: "Submittals", labelAr: "مرشح مقدّم" },
      { valueEn: "52%", labelEn: "Saudi placement", labelAr: "توظيف سعودي" },
      { valueEn: "40+", labelEn: "Countries sourced", labelAr: "دولة للاستقطاب" },
    ],
    items: [
      { en: "Professional Recruitment", ar: "التوظيف المهني" },
      { en: "Executive Search", ar: "البحث التنفيذي" },
      { en: "Mass Recruitment", ar: "التوظيف الجماعي" },
      { en: "Saudi Talent Acquisition", ar: "استقطاب الكوادر السعودية" },
      { en: "Recruitment Process Outsourcing (RPO)", ar: "الاستعانة بمصادر خارجية للتوظيف" },
      { en: "Talent Mapping", ar: "رسم خرائط المواهب" },
      { en: "Candidate Assessment", ar: "تقييم المرشحين" },
      { en: "Competency-Based Interviews", ar: "المقابلات المبنية على الكفاءات" },
      { en: "Employer Branding", ar: "العلامة التجارية لصاحب العمل" },
      { en: "Talent Pool Development", ar: "تطوير مجموعة المواهب" },
      { en: "Onboarding Support", ar: "دعم الإعداد الوظيفي" },
    ],
    processSteps: [
      { en: "Workforce Need", ar: "الحاجة" },
      { en: "Role Profile", ar: "تحديد الدور" },
      { en: "Sourcing", ar: "التوصل" },
      { en: "Assessment", ar: "التقييم" },
      { en: "Interview", ar: "المقابلة" },
      { en: "Shortlist", ar: "القائمة المختصرة" },
      { en: "Hire", ar: "التعيين" },
      { en: "Onboard", ar: "الإعداد" },
    ],
    processTagline: {
      en: "Talent Finds a Way. We Make It Happen.",
      ar: "المواهب تجد طريقها. ونحن نيسّر ذلك.",
    },
    cta: {
      en: "Start Hiring Smarter",
      ar: "ابدأ التوظيف بشكل أذكى",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "learning-development": {
    slug: "learning-development",
    hero: {
      en: "Develop Skills\nThat Make a Difference.",
      ar: "التعلم والتطوير —\nاستثمار في الإنسان يبني فرقاً حقيقياً",
      subtitleEn:
        "We build development journeys that improve performance, build leaders and grow careers.",
      subtitleAr: "نبني رحلات تطوير تعزز الأداء وتصنع القادة وتنمّي المسارات المهنية",
    },
    items: [
      { en: "Training Needs Analysis", ar: "تحليل احتياجات التدريب" },
      { en: "Annual Training Plans", ar: "خطط التدريب السنوية" },
      { en: "Leadership Development Journeys", ar: "رحلات تطوير القيادة" },
      { en: "Management Development", ar: "تطوير الإدارة" },
      { en: "Saudi Talent Development", ar: "تطوير الكوادر السعودية" },
      { en: "Graduate Development Programs", ar: "برامج تطوير الخريجين" },
      { en: "First-Time Manager Programs", ar: "برامج المديرين الجدد" },
      { en: "Coaching & Mentoring", ar: "التدريب والإرشاد" },
      { en: "Service Excellence", ar: "التميز في الخدمة" },
      { en: "Hospitality Training", ar: "تدريب الضيافة" },
      { en: "Corporate Academies", ar: "الأكاديميات المؤسسية" },
    ],
    journeyHeadline: {
      en: "We don't deliver courses.\nWe build journeys.",
      ar: "لا نقدم دورات.\nنبني رحلات.",
    },
    journeySteps: [
      { en: "Assess", ar: "قيّم" },
      { en: "Plan", ar: "خطّط" },
      { en: "Learn", ar: "تعلّم" },
      { en: "Apply", ar: "طبّق" },
      { en: "Coach", ar: "درّب" },
      { en: "Measure", ar: "قِس" },
    ],
    journeyTagline: {
      en: "Learning Today.\nA Stronger Tomorrow.",
      ar: "مهارات اليوم هي فرص الغد",
    },
    cta: {
      en: "Explore All Solutions",
      ar: "استكشف جميع الحلول",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "leadership-development": {
    slug: "leadership-development",
    hero: {
      en: "Leaders for\na Better Tomorrow.",
      ar: "تطوير القيادات — صناع التميز\nيبدأون من هنا",
      subtitleEn:
        "We develop leaders at every level — from emerging managers to senior executives.",
      subtitleAr: "نطوّر القادة على كل المستويات — من المديرين الناشئين إلى التنفيذيين",
    },
    items: [
      { en: "Emerging Leaders Programs", ar: "برامج القادة الناشئين" },
      { en: "Saudi Future Leaders", ar: "قادة المستقبل السعوديين" },
      { en: "First-Time Managers", ar: "المديرون الجدد" },
      { en: "Executive Leadership Development", ar: "تطوير القيادة التنفيذية" },
      { en: "High-Potential Development", ar: "تطوير أصحاب الإمكانات العالية" },
      { en: "Leadership Assessment", ar: "تقييم القيادة" },
      { en: "Executive / Manager Coaching", ar: "تدريب المديرين والمسؤولين" },
      { en: "Succession Development", ar: "تطوير التخطيط للخلافة" },
    ],
    quote: { en: "Leadership Starts Within.", ar: "القيادة تبدأ من الداخل." },
    cta: {
      en: "Invest In Your Leaders",
      ar: "استثمر في قياداتك",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "hospitality-tourism": {
    slug: "hospitality-tourism",
    hero: {
      en: "People Who Create\nExceptional Guest Experiences.",
      ar: "حلول الضيافة والسياحة —\nخبرة متخصصة في قطاع الضيافة",
      subtitleEn:
        "Specialized people solutions for hospitality and tourism organizations in Saudi Arabia and across the region.",
      subtitleAr: "حلول متخصصة للموارد البشرية في الضيافة والسياحة في المملكة والمنطقة",
    },
    stats: [
      { valueEn: "500+", labelEn: "Hospitality professionals", labelAr: "متخصص في الضيافة" },
      { valueEn: "2,000+", labelEn: "Operational hours", labelAr: "ساعة تشغيل" },
      { valueEn: "10+", labelEn: "Pre-opening projects", labelAr: "مشروع افتتاح مسبق" },
    ],
    items: [
      { en: "Pre-Opening HR Support", ar: "دعم الموارد البشرية قبل الافتتاح" },
      { en: "Workforce Planning", ar: "تخطيط القوى العاملة" },
      { en: "Mass Recruitment", ar: "التوظيف الجماعي" },
      { en: "Saudization Strategy", ar: "استراتيجية السعودة" },
      { en: "Service Culture & Training", ar: "ثقافة الخدمة والتدريب" },
      { en: "Operational Readiness", ar: "الاستعداد التشغيلي" },
      { en: "Leadership Development", ar: "تطوير القيادات" },
      { en: "Employee Experience", ar: "تجربة الموظف" },
      { en: "Organization Design", ar: "التصميم التنظيمي" },
    ],
    quote: {
      en: "Extraordinary Hospitality\nStarts With Great People.",
      ar: "الضيافة الاستثنائية تبدأ بأناس متميزين",
    },
    cta: {
      en: "Explore Hospitality Solutions",
      ar: "استكشف حلول الضيافة",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "people-function": {
    slug: "people-function",
    hero: {
      en: "Set Up Your\nPeople Function. Right.",
      ar: "بناء وظيفة الموارد البشرية —\nمن الأساس إلى التميز",
      subtitleEn:
        "For startups, scale-ups and growing businesses building their people foundations.",
      subtitleAr: "للشركات الناشئة والنامية التي تبني أساسياتها في الموارد البشرية",
    },
    numberedSteps: [
      { en: "Organization and workforce design", ar: "تصميم المنظمة والقوى العاملة" },
      { en: "Role definition and job descriptions", ar: "تحديد الأدوار والأوصاف الوظيفية" },
      { en: "Recruitment and talent pipeline", ar: "التوظيف وتدفق المواهب" },
      { en: "Onboarding framework", ar: "إطار الإعداد الوظيفي" },
      { en: "Performance management", ar: "إدارة الأداء" },
      { en: "Learning and leadership development", ar: "التعلم وتطوير القيادات" },
      { en: "Culture and employee experience", ar: "الثقافة وتجربة الموظف" },
      { en: "HR governance and policies", ar: "حوكمة الموارد البشرية والسياسات" },
      { en: "People metrics and reporting", ar: "مقاييس الأفراد والتقارير" },
      { en: "Ongoing advisory support", ar: "الدعم الاستشاري المستمر" },
    ],
    positioning: {
      en: "Build Today for What's Next.",
      ar: "ابنِ اليوم لما هو قادم",
    },
    positioningSub: {
      en: "Not just HR admin. A strategic people function that drives growth.",
      ar: "ليس مجرد إدارة موارد بشرية. وظيفة استراتيجية تدفع النمو",
    },
    cta: {
      en: "Start Your Journey",
      ar: "ابدأ رحلتك",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
  "hr-advisory": {
    slug: "hr-advisory",
    hero: {
      en: "HR Advisory\n& People Partner.",
      ar: "الاستشارات الاستراتيجية\nللموارد البشرية",
      subtitleEn: "Strategic HR guidance, governance and compliance for growing organizations.",
      subtitleAr: "إرشاد استراتيجي في الموارد البشرية والحوكمة والامتثال",
    },
    items: [
      { en: "HR Strategy & Governance", ar: "استراتيجية الموارد البشرية والحوكمة" },
      { en: "HR Policies & Employee Handbook", ar: "السياسات ودليل الموظف" },
      { en: "Employee Relations", ar: "علاقات الموظفين" },
      { en: "Saudi Labor Compliance", ar: "الامتثال لنظام العمل السعودي" },
      { en: "Saudization Advisory", ar: "استشارات السعودة" },
      { en: "Compensation & Benefits", ar: "التعويضات والمزايا" },
      { en: "HR Audits", ar: "مراجعات الموارد البشرية" },
      { en: "Fractional HR Director", ar: "مدير موارد بشرية جزئي" },
    ],
    cta: {
      en: "Get Expert HR Guidance",
      ar: "احصل على إرشاد متخصص",
      buttonEn: "Book a Consultation",
      buttonAr: "احجز استشارة",
    },
  },
};
