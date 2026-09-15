export type InsightCategory =
  | "all"
  | "people"
  | "leadership"
  | "recruitment"
  | "saudi-hr"
  | "hospitality";

export type InsightArticle = {
  slug: string;
  category: InsightCategory;
  categoryLabelEn: string;
  categoryLabelAr: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  date: string;
  readMinutes: number;
  bodyEn: string[];
  bodyAr: string[];
};

export const INSIGHT_ARTICLES: InsightArticle[] = [
  {
    slug: "hospitality-talent",
    category: "hospitality",
    categoryLabelEn: "Saudi Talent",
    categoryLabelAr: "المواهب السعودية",
    titleEn: "The Future of Hospitality Talent in Saudi Arabia",
    titleAr: "مستقبل مواهب الضيافة في المملكة",
    excerptEn: "How giga-projects and tourism growth are reshaping hospitality hiring and development.",
    excerptAr: "كيف تعيد المشاريع الكبرى ونمو السياحة تشكيل التوظيف والتطوير في الضيافة.",
    date: "June 2026",
    readMinutes: 6,
    bodyEn: [
      "Saudi Arabia’s hospitality sector is entering a new phase of scale. Pre-opening timelines, Saudization targets and guest experience standards all converge on one priority: people.",
      "Organizations that invest early in workforce planning, assessment and service culture training see faster ramp-up and stronger retention.",
      "Basalim partners with hospitality groups on end-to-end people solutions—from mass recruitment to leadership readiness before doors open.",
    ],
    bodyAr: [
      "يدخل قطاع الضيافة في المملكة مرحلة جديدة من النمو. تجتمع جداول الافتتاح وأهداف السعودة ومعايير تجربة الضيف على أولوية واحدة: الإنسان.",
      "المنظمات التي تستثمر مبكراً في تخطيط القوى العاملة والتقييم وتدريب ثقافة الخدمة تحقق إطلاقاً أسرع واحتفاظاً أقوى بالمواهب.",
      "تتعاون باسالم مع مجموعات الضيافة في حلول متكاملة للموارد البشرية — من التوظيف الجماعي إلى جاهزية القيادات قبل الافتتاح.",
    ],
  },
  {
    slug: "people-first-culture",
    category: "people",
    categoryLabelEn: "People & Culture",
    categoryLabelAr: "الناس والثقافة",
    titleEn: "Building a People-First Culture",
    titleAr: "بناء ثقافة تضع الإنسان أولاً",
    excerptEn: "Practical steps to align leadership behavior, systems and employee experience.",
    excerptAr: "خطوات عملية لمواءمة سلوك القيادة والأنظمة وتجربة الموظف.",
    date: "May 2026",
    readMinutes: 5,
    bodyEn: [
      "A people-first culture is not a poster—it is how decisions are made, how managers coach and how performance is measured.",
      "Start with listening: engagement pulses, stay interviews and clear role expectations.",
      "Align HR systems so hiring, development and rewards reinforce the behaviors you want at scale.",
    ],
    bodyAr: [
      "الثقافة التي تضع الإنسان أولاً ليست شعاراً—بل هي طريقة اتخاذ القرار والتدريب وقياس الأداء.",
      "ابدأ بالاستماع: نبض المشاركة ومقابلات البقاء ووضوح توقعات الدور.",
      "وائم أنظمة الموارد البشرية بحيث يعزز التوظيف والتطوير والمكافآت السلوكيات المطلوبة.",
    ],
  },
  {
    slug: "saudi-leadership",
    category: "leadership",
    categoryLabelEn: "Leadership",
    categoryLabelAr: "القيادة",
    titleEn: "What Makes Leaders in Saudi Arabia Different",
    titleAr: "ما الذي يميّز القادة في المملكة",
    excerptEn: "Regional context, vision alignment and bilingual teams shape effective leadership.",
    excerptAr: "السياق المحلي ومواءمة الرؤية والفرق ثنائية اللغة تشكل قيادة فعالة.",
    date: "April 2026",
    readMinutes: 7,
    bodyEn: [
      "Leaders in the Kingdom operate at the intersection of ambitious national vision and global best practice.",
      "Effective programs blend local mentorship, executive coaching and measurable behavior change—not classroom theory alone.",
      "Invest in first-time managers and high-potential pipelines early; they carry culture into every team.",
    ],
    bodyAr: [
      "يعمل القادة في المملكة عند تقاطع رؤية وطنية طموحة وأفضل الممارسات العالمية.",
      "البرامج الفعالة تمزج الإرشاد المحلي والتدريب التنفيذي وتغيير السلوك القابل للقياس.",
      "استثمر في المديرين الجدد وخطوط الإمكانات العالية مبكراً؛ فهم ينقلون الثقافة إلى كل فريق.",
    ],
  },
  {
    slug: "wellbeing-at-work",
    category: "saudi-hr",
    categoryLabelEn: "HR Advisory",
    categoryLabelAr: "استشارات الموارد البشرية",
    titleEn: "Wellbeing at Work: Why It Matters Now",
    titleAr: "الرفاهية في العمل: لماذا تهم الآن",
    excerptEn: "Wellbeing links directly to retention, productivity and employer brand.",
    excerptAr: "ترتبط الرفاهية مباشرة بالاحتفاظ والإنتاجية وعلامة صاحب العمل.",
    date: "March 2026",
    readMinutes: 4,
    bodyEn: [
      "Employees expect sustainable workloads, clear communication and growth—not perks alone.",
      "HR policies, manager capability and workload design must work together.",
      "Measure what matters: absenteeism, engagement and internal mobility—not vanity metrics.",
    ],
    bodyAr: [
      "يتوقع الموظفون أعباء عمل مستدامة وتواصلًا واضحاً ونمواً—not مزايا فقط.",
      "يجب أن تعمل السياسات وقدرة المدير وتصميم العمل معاً.",
      "قِس ما يهم: الغياب والمشاركة والحركة الداخلية.",
    ],
  },
  {
    slug: "saudization-2026",
    category: "recruitment",
    categoryLabelEn: "Recruitment",
    categoryLabelAr: "التوظيف",
    titleEn: "Saudization in 2026: What You Need to Know",
    titleAr: "السعودة في 2026: ما تحتاج معرفته",
    excerptEn: "Planning, pipelines and employer brand for sustainable Saudi talent outcomes.",
    excerptAr: "التخطيط ومسارات المواهب وعلامة صاحب العمل لنتائج سعودة مستدامة.",
    date: "February 2026",
    readMinutes: 6,
    bodyEn: [
      "Saudization is a strategic workforce design challenge—not a last-minute compliance checkbox.",
      "Build talent pools, graduate programs and clear career paths for Saudi nationals.",
      "Partner with specialists who understand sector-specific quotas and sourcing channels.",
    ],
    bodyAr: [
      "السعودة تحدٍّ في تصميم القوى العاملة—not خانة امتثال في اللحظة الأخيرة.",
      "ابنِ مجموعات مواهب وبرامج خريجين ومسارات مهنية واضحة للمواطنين.",
      "تعاون مع متخصصين يفهمون متطلبات القطاع وقنوات الاستقطاب.",
    ],
  },
  {
    slug: "pre-opening-hr-plan",
    category: "hospitality",
    categoryLabelEn: "Hospitality",
    categoryLabelAr: "الضيافة",
    titleEn: "Building a Pre-Opening HR Plan That Works",
    titleAr: "بناء خطة موارد بشرية قبل الافتتاح",
    excerptEn: "Timeline, roles and training waves for successful property launches.",
    excerptAr: "الجدول الزمني والأدوار وموجات التدريب لإطلاقات ناجحة.",
    date: "January 2026",
    readMinutes: 8,
    bodyEn: [
      "Pre-opening HR starts months before interviews—workforce sizing, org design and compensation benchmarks come first.",
      "Sequence hiring waves by department and align training with operational readiness milestones.",
      "Track leading indicators: offer acceptance, time-to-productivity and service audit scores.",
    ],
    bodyAr: [
      "تبدأ الموارد البشرية قبل الافتتاح قبل أشهر من المقابلات—تحديد حجم القوى العاملة والتصميم التنظيمي أولاً.",
      "رتّب موجات التوظيف حسب الإدارة ووائم التدريب مع معالم الجاهزية التشغيلية.",
      "تابع مؤشرات استباقية: قبول العروض والوقت حتى الإنتاجية ونتائج تدقيق الخدمة.",
    ],
  },
];

export function getArticle(slug: string): InsightArticle | undefined {
  return INSIGHT_ARTICLES.find((a) => a.slug === slug);
}

export function relatedArticles(slug: string, limit = 3): InsightArticle[] {
  const current = getArticle(slug);
  if (!current) return INSIGHT_ARTICLES.slice(0, limit);
  return INSIGHT_ARTICLES.filter((a) => a.slug !== slug && a.category === current.category).slice(
    0,
    limit,
  ).concat(INSIGHT_ARTICLES.filter((a) => a.slug !== slug).slice(0, limit)).slice(0, limit);
}
