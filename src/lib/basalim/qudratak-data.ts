import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  Briefcase,
  ChartLine,
  Compass,
  FileText,
  Handshake,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

export type QudratakJourneyStep = {
  icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
};

export const QUDRATAK_JOURNEY: QudratakJourneyStep[] = [
  {
    icon: Compass,
    titleEn: "Discover",
    titleAr: "اكتشف",
    descEn: "Understand your strengths",
    descAr: "اعرف اهتماماتك ونقاط قوتك",
  },
  {
    icon: ChartLine,
    titleEn: "Assess",
    titleAr: "قيّم",
    descEn: "Complete a scientific assessment",
    descAr: "أكمل تقييماً علمياً متخصصاً",
  },
  {
    icon: Rocket,
    titleEn: "Develop",
    titleAr: "طور",
    descEn: "Get a personal development plan",
    descAr: "احصل على خطة تطوير شخصية",
  },
  {
    icon: BookOpen,
    titleEn: "Learn",
    titleAr: "تعلّم",
    descEn: "Access recommended learning",
    descAr: "وصل إلى برامج تعليمية موصى بها",
  },
  {
    icon: Handshake,
    titleEn: "Mentor",
    titleAr: "أرشد",
    descEn: "Connect with mentors & experts",
    descAr: "تواصل مع مرشدين ومتخصصين",
  },
  {
    icon: Wrench,
    titleEn: "Prepare",
    titleAr: "استعد",
    descEn: "Improve your CV & interview skills",
    descAr: "حسّن سيرتك ومهارات المقابلة",
  },
  {
    icon: Target,
    titleEn: "Match",
    titleAr: "طابق",
    descEn: "Find roles that match your profile",
    descAr: "اكتشف الأدوار المناسبة لملفك",
  },
  {
    icon: Trophy,
    titleEn: "Get Hired",
    titleAr: "احصل على الفرصة",
    descEn: "Connect with the right employers",
    descAr: "تواصل مع أصحاب العمل المناسبين",
  },
];

export type QudratakFeature = {
  icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
};

export const QUDRATAK_FEATURES: QudratakFeature[] = [
  {
    icon: Brain,
    titleEn: "Career Personality Assessment",
    titleAr: "تقييم شخصية مهنية",
    descEn: "A scientific assessment that reveals your true potential.",
    descAr: "تقييم علمي يكشف إمكاناتك الحقيقية",
  },
  {
    icon: FileText,
    titleEn: "CV & ATS Tools",
    titleAr: "أدوات السيرة الذاتية",
    descEn: "Professional CVs that pass applicant tracking filters.",
    descAr: "سيرة ذاتية احترافية تجتاز فلاتر التوظيف",
  },
  {
    icon: UserRound,
    titleEn: "Professional Mentoring",
    titleAr: "الإرشاد المهني",
    descEn: "Connect with experts in your field.",
    descAr: "تواصل مع خبراء في مجالك",
  },
  {
    icon: Briefcase,
    titleEn: "Job Opportunities",
    titleAr: "فرص العمل",
    descEn: "Curated roles that fit your profile.",
    descAr: "وظائف منتقاة تناسب ملفك",
  },
  {
    icon: Users,
    titleEn: "Youth Community",
    titleAr: "مجتمع الشباب",
    descEn: "A network of ambitious young professionals like you.",
    descAr: "شبكة من الشباب الطموح مثلك",
  },
  {
    icon: Sparkles,
    titleEn: "Success Stories",
    titleAr: "قصص نجاح",
    descEn: "Learn from those who came before you.",
    descAr: "تعلّم من تجارب من سبقوك",
  },
];

export const QUDRATAK_MENTORS = [
  {
    nameEn: "Sara Al-Harbi",
    nameAr: "سارة الحربي",
    titleEn: "HR Professional",
    titleAr: "متخصصة موارد بشرية",
    expertiseEn: "Talent & Saudization",
    expertiseAr: "المواهب والسعودة",
    rating: 4.9,
  },
  {
    nameEn: "Omar Khalid",
    nameAr: "عمر خالد",
    titleEn: "Career Coach",
    titleAr: "مدرب مهني",
    expertiseEn: "Early-career growth",
    expertiseAr: "نمو المسار المبكر",
    rating: 4.8,
  },
  {
    nameEn: "Lina Mansour",
    nameAr: "لينا منصور",
    titleEn: "Learning Specialist",
    titleAr: "متخصصة تعلم وتطوير",
    expertiseEn: "Skills & assessments",
    expertiseAr: "المهارات والتقييمات",
    rating: 5,
  },
];

export const QUDRATAK_SAMPLE_JOBS = [
  {
    titleEn: "Training Manager",
    titleAr: "مدير تدريب",
    locationEn: "Amman, Jordan",
    locationAr: "عمان، الأردن",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "HR Coordinator",
    titleAr: "منسق موارد بشرية",
    locationEn: "Riyadh, Saudi Arabia",
    locationAr: "الرياض، المملكة",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "Finance Manager",
    titleAr: "مدير مالي",
    locationEn: "Jeddah, Saudi Arabia",
    locationAr: "جدة، المملكة",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "IT Supervisor",
    titleAr: "مشرف تقنية المعلومات",
    locationEn: "Remote",
    locationAr: "عن بُعد",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
];

export type PricingPlanId = "free" | "professional" | "premium" | "mentor";

export type QudratakPricingPlan = {
  id: PricingPlanId;
  nameEn: string;
  nameAr: string;
  priceEn: string;
  priceAr: string;
  featured?: boolean;
  premiumStyle?: boolean;
  mentorStyle?: boolean;
  featuresEn: string[];
  featuresAr: string[];
  excludedEn?: string[];
  excludedAr?: string[];
  ctaEn: string;
  ctaAr: string;
};

export const QUDRATAK_PRICING: QudratakPricingPlan[] = [
  {
    id: "free",
    nameEn: "Free",
    nameAr: "مجاني",
    priceEn: "SAR 0",
    priceAr: "0 ر.س",
    featuresEn: [
      "Create your profile",
      "Browse jobs",
      "Basic CV builder",
      "Smart assessment (free for everyone)",
    ],
    featuresAr: [
      "إنشاء ملف شخصي",
      "تصفح الوظائف",
      "منشئ السيرة الذاتية الأساسي",
      "التقييم الذكي (مجاني للجميع)",
    ],
    excludedEn: ["ATS optimization", "AI interview practice"],
    excludedAr: ["تحسين ATS", "المقابلة بالذكاء الاصطناعي"],
    ctaEn: "Start for Free",
    ctaAr: "ابدأ مجاناً",
  },
  {
    id: "professional",
    nameEn: "Pro",
    nameAr: "برو",
    priceEn: "SAR 99 / month + VAT",
    priceAr: "99 ر.س / شهرياً + ض.ق.م",
    featured: true,
    featuresEn: [
      "Everything in Free",
      "AI CV analysis",
      "ATS optimization",
      "AI interview practice",
      "Smart job matching",
    ],
    featuresAr: [
      "كل شيء في المجاني",
      "تحليل السيرة الذاتية بالذكاء الاصطناعي",
      "تحسين ATS",
      "المقابلات بالذكاء الاصطناعي",
      "مطابقة الوظائف الذكية",
    ],
    ctaEn: "Start Pro",
    ctaAr: "ابدأ برو",
  },
  {
    id: "premium",
    nameEn: "Premium",
    nameAr: "بريميوم",
    priceEn: "SAR 299 / month + VAT",
    priceAr: "299 ر.س / شهرياً + ض.ق.م",
    premiumStyle: true,
    featuresEn: [
      "Everything in Pro",
      "HR advisory sessions",
      "Mentor sessions",
      "Priority job matching",
      "Dedicated support",
    ],
    featuresAr: [
      "كل شيء في برو",
      "استشارات HR",
      "جلسات مع المرشدين",
      "أولوية في مطابقة الوظائف",
      "دعم مخصص",
    ],
    ctaEn: "Get Premium",
    ctaAr: "احصل على بريميوم",
  },
  {
    id: "mentor",
    nameEn: "I am a Mentor",
    nameAr: "أنا مرشد",
    priceEn: "Earn per session",
    priceAr: "أرباح لكل جلسة",
    mentorStyle: true,
    featuresEn: [
      "Create a mentor profile",
      "Set your own rates",
      "Keep 75% of each session",
      "Platform handles payments",
      "Subject to admin approval",
    ],
    featuresAr: [
      "إنشاء ملف مرشد",
      "حدد أسعارك الخاصة",
      "احصل على 75% من كل جلسة",
      "المنصة تدير المدفوعات",
      "خاضع لموافقة الإدارة",
    ],
    ctaEn: "Join as Mentor",
    ctaAr: "انضم كمرشد",
  },
];
