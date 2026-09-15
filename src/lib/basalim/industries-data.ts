export type IndustryCard = {
  slug: string;
  icon: string;
  featured?: boolean;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
};

export type IndustryDetail = IndustryCard & {
  challengesEn: string[];
  challengesAr: string[];
  helpEn: string[];
  helpAr: string[];
  servicesEn: string[];
  servicesAr: string[];
  caseEn: string;
  caseAr: string;
};

export const INDUSTRY_CARDS: IndustryCard[] = [
  {
    slug: "hospitality",
    icon: "hotel",
    featured: true,
    titleEn: "Hospitality & Tourism",
    titleAr: "الضيافة والسياحة",
    descEn: "Pre-opening, operations, recruitment and training expertise.",
    descAr: "خبرة في ما قبل الافتتاح والتشغيل",
  },
  {
    slug: "real-estate",
    icon: "building",
    titleEn: "Real Estate & Mega Projects",
    titleAr: "العقارات والمشاريع الكبرى",
    descEn: "People solutions for large-scale development projects.",
    descAr: "حلول بشرية لمشاريع التطوير الكبرى",
  },
  {
    slug: "healthcare",
    icon: "health",
    titleEn: "Healthcare & Wellness",
    titleAr: "الرعاية الصحية والعافية",
    descEn: "Talent and HR for healthcare providers.",
    descAr: "الموهبة والموارد البشرية لمقدمي الرعاية الصحية",
  },
  {
    slug: "startups",
    icon: "rocket",
    titleEn: "Startups & SMEs",
    titleAr: "الشركات الناشئة والمتوسطة",
    descEn: "Build your people function from day one.",
    descAr: "ابنِ وظيفة الموارد البشرية من اليوم الأول",
  },
  {
    slug: "government",
    icon: "landmark",
    titleEn: "Government & Semi-Gov",
    titleAr: "الحكومي وشبه الحكومي",
    descEn: "Transformation and capability building for government entities.",
    descAr: "التحول وبناء القدرات للجهات الحكومية",
  },
  {
    slug: "family-business",
    icon: "users",
    titleEn: "Family Businesses",
    titleAr: "الشركات العائلية",
    descEn: "Governance, succession and professionalization of people systems.",
    descAr: "الحوكمة والخلافة والتطوير المؤسسي",
  },
];

const detail = (
  card: IndustryCard,
  extra: Omit<IndustryDetail, keyof IndustryCard>,
): IndustryDetail => ({ ...card, ...extra });

export const INDUSTRY_DETAILS: Record<string, IndustryDetail> = {
  hospitality: detail(INDUSTRY_CARDS[0], {
    challengesEn: [
      "Tight pre-opening timelines and large hiring volumes",
      "Service culture and guest experience standards",
      "Saudization and bilingual workforce needs",
    ],
    challengesAr: [
      "جداول افتتاح ضيقة وحجم توظيف كبير",
      "ثقافة الخدمة ومعايير تجربة الضيف",
      "متطلبات السعودة وقوى عاملة ثنائية اللغة",
    ],
    helpEn: [
      "Pre-opening HR operating models",
      "Mass recruitment and assessment",
      "Service training and leadership readiness",
    ],
    helpAr: [
      "نماذج تشغيل الموارد البشرية قبل الافتتاح",
      "التوظيف الجماعي والتقييم",
      "تدريب الخدمة وجاهزية القيادات",
    ],
    servicesEn: ["Hospitality & Tourism Solutions", "Talent Acquisition", "Learning & Development"],
    servicesAr: ["حلول الضيافة والسياحة", "التوظيف والاستقطاب", "التعلم والتطوير"],
    caseEn:
      "Supported a luxury resort pre-opening with workforce planning, 280+ hires and operational readiness within six months.",
    caseAr: "دعم افتتاح منتجع فاخر عبر تخطيط القوى العاملة وتوظيف أكثر من 280 موظفاً والجاهزية التشغيلية خلال ستة أشهر.",
  }),
  "real-estate": detail(INDUSTRY_CARDS[1], {
    challengesEn: ["Project-based hiring surges", "Contractor and permanent mix", "Safety and compliance culture"],
    challengesAr: ["موجات توظيف مرتبطة بالمشاريع", "مزيج مقاولين وموظفين دائمين", "ثقافة السلامة والامتثال"],
    helpEn: ["Workforce planning by project phase", "Role architecture for mega sites", "Performance and safety systems"],
    helpAr: ["تخطيط القوى العاملة حسب مراحل المشروع", "بنية الأدوار للمواقع الكبرى", "أنظمة الأداء والسلامة"],
    servicesEn: ["Organizational Development", "Talent Acquisition", "HR Advisory"],
    servicesAr: ["التطوير التنظيمي", "التوظيف", "الاستشارات"],
    caseEn: "Structured people plans for a mixed-use development covering recruitment waves and grading frameworks.",
    caseAr: "خطط موارد بشرية لمشروع متعدد الاستخدامات شملت موجات التوظيف وأطر الدرجات الوظيفية.",
  }),
  healthcare: detail(INDUSTRY_CARDS[2], {
    challengesEn: ["Clinical and admin talent scarcity", "Regulatory compliance", "Retention in high-pressure roles"],
    challengesAr: ["ندرة الكوادر السريرية والإدارية", "الامتثال التنظيمي", "الاحتفاظ بالمواهب في بيئات عالية الضغط"],
    helpEn: ["Competency-based hiring", "Policy and handbook design", "Leadership and team development"],
    helpAr: ["توظيف قائم على الكفاءات", "تصميم السياسات ودليل الموظف", "تطوير القيادات والفرق"],
    servicesEn: ["Talent Acquisition", "Learning & Development", "HR Advisory"],
    servicesAr: ["التوظيف", "التعلم والتطوير", "الاستشارات"],
    caseEn: "Built recruitment and onboarding pathways for a regional healthcare provider expanding into new cities.",
    caseAr: "بناء مسارات توظيف وإعداد لمقدم رعاية صحية يتوسع في مدن جديدة.",
  }),
  startups: detail(INDUSTRY_CARDS[3], {
    challengesEn: ["No HR foundation yet", "Fast growth and unclear roles", "Founder-led hiring bottlenecks"],
    challengesAr: ["لا توجد أساسيات موارد بشرية", "نمو سريع وأدوار غير واضحة", "اختناقات التوظيف بقيادة المؤسسين"],
    helpEn: ["People function design", "Lightweight performance systems", "Scalable recruitment playbooks"],
    helpAr: ["تصميم وظيفة الموارد البشرية", "أنظمة أداء خفيفة", "أدلة توظيف قابلة للتوسع"],
    servicesEn: ["Build Your People Function", "Talent Acquisition", "HR Advisory"],
    servicesAr: ["بناء وظيفة الموارد البشرية", "التوظيف", "الاستشارات"],
    caseEn: "Delivered a full people stack for a Saudi tech startup in three months—from roles to policies and hiring.",
    caseAr: "تسليم منظومة موارد بشرية كاملة لشركة تقنية سعودية خلال ثلاثة أشهر.",
  }),
  government: detail(INDUSTRY_CARDS[4], {
    challengesEn: ["Transformation programs", "Capability gaps in new structures", "Change management at scale"],
    challengesAr: ["برامج التحول", "فجوات القدرات في الهياكل الجديدة", "إدارة التغيير على نطاق واسع"],
    helpEn: ["Organization design", "Competency frameworks", "Training and leadership pathways"],
    helpAr: ["التصميم التنظيمي", "أطر الكفاءات", "مسارات التدريب والقيادة"],
    servicesEn: ["Organizational Development", "Learning & Development", "Leadership Development"],
    servicesAr: ["التطوير التنظيمي", "التعلم والتطوير", "تطوير القيادات"],
    caseEn: "Supported a semi-government entity with role clarification and performance system rollout.",
    caseAr: "دعم جهة شبه حكومية في توضيح الأدوار وإطلاق نظام الأداء.",
  }),
  "family-business": detail(INDUSTRY_CARDS[5], {
    challengesEn: ["Succession planning", "Informal HR practices", "Professionalizing governance"],
    challengesAr: ["التخطيط للخلافة", "ممارسات موارد بشرية غير رسمية", "احترافية الحوكمة"],
    helpEn: ["Family governance advisory", "HR policy and grading", "Next-gen leadership programs"],
    helpAr: ["استشارات حوكمة عائلية", "سياسات الموارد البشرية والدرجات", "برامج قيادة الجيل القادم"],
    servicesEn: ["HR Advisory", "Leadership Development", "Organizational Development"],
    servicesAr: ["الاستشارات", "تطوير القيادات", "التطوير التنظيمي"],
    caseEn: "Helped a multi-generational business document roles, succession paths and HR policies.",
    caseAr: "مساعدة شركة عائلية متعددة الأجيال في توثيق الأدوار ومسارات الخلافة وسياسات الموارد البشرية.",
  }),
};
