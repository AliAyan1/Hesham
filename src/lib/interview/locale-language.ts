export type InterviewLocale = "en" | "ar" | "fr" | "es" | "ur" | "tr";

const SUPPORTED: InterviewLocale[] = ["en", "ar", "fr", "es", "ur", "tr"];

export function normalizeInterviewLocale(raw: string | undefined | null): InterviewLocale {
  const base = (raw ?? "en").split("-")[0]?.toLowerCase() ?? "en";
  if (SUPPORTED.includes(base as InterviewLocale)) return base as InterviewLocale;
  return "en";
}

export function getWhisperLanguageCode(locale: string): string {
  const codes: Record<string, string> = {
    ar: "ar",
    en: "en",
    fr: "fr",
    es: "es",
    ur: "ur",
    tr: "tr",
  };
  return codes[normalizeInterviewLocale(locale)] ?? "en";
}

export function getInterviewLanguageLabel(locale: string): string {
  const labels: Record<InterviewLocale, string> = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    es: "Spanish",
    ur: "Urdu",
    tr: "Turkish",
  };
  return labels[normalizeInterviewLocale(locale)];
}

export function getInterviewLanguageFlag(locale: string): string {
  const flags: Record<InterviewLocale, string> = {
    en: "🇬🇧",
    ar: "🇸🇦",
    fr: "🇫🇷",
    es: "🇪🇸",
    ur: "🇵🇰",
    tr: "🇹🇷",
  };
  return flags[normalizeInterviewLocale(locale)];
}

export function getQuestionGenerationLanguageInstruction(locale: string): string {
  const loc = normalizeInterviewLocale(locale);
  const map: Record<InterviewLocale, string> = {
    en: "Generate interview questions in professional English.",
    ar: "Generate interview questions in Modern Standard Arabic (فصحى). Put Arabic in both question and questionAr fields.",
    fr: "Generate interview questions in professional French.",
    es: "Generate interview questions in professional Spanish.",
    ur: "Generate interview questions in formal Urdu.",
    tr: "Generate interview questions in professional Turkish.",
  };
  return map[loc];
}

export function getAnalysisLanguageInstruction(locale: string): string {
  const lang = getInterviewLanguageLabel(locale);
  return (
    `Write all feedback, strengths, and improvement tips in ${lang}. ` +
    `Put the primary narrative in overallFeedback and per-question feedback fields. ` +
    `Also provide overallFeedbackAr and feedbackAr as Arabic translations for employer review.`
  );
}

export function getLaraIntro(locale: string, questionCount: number): string {
  const n = String(questionCount);
  const intros: Record<InterviewLocale, string> = {
    en:
      `Hello! I'm Lara, your AI interviewer from QudrahTech. I'm excited to learn more about you today. ` +
      `We'll go through ${n} questions together. Please answer each question clearly and take your time. Let's begin!`,
    ar:
      `مرحباً! أنا لارا، محاورتك الذكية من قدرتك. يسعدني التعرّف عليك اليوم. ` +
      `سنمرّ على ${n} أسئلة معاً. يُرجى الإجابة بوضوح وأخذ وقتك. لنبدأ!`,
    fr:
      `Bonjour ! Je suis Lara, votre intervieweuse IA de QudrahTech. Je suis ravie d'en apprendre plus sur vous aujourd'hui. ` +
      `Nous passerons en revue ${n} questions ensemble. Répondez clairement et prenez votre temps. Commençons !`,
    es:
      `¡Hola! Soy Lara, tu entrevistadora de IA de QudrahTech. Me alegra conocerte hoy. ` +
      `Repasaremos ${n} preguntas juntos. Responde con claridad y tómate tu tiempo. ¡Empecemos!`,
    ur:
      `ہیلو! میں لارا ہوں، QudrahTech کی AI انٹرویوئر۔ آج آپ کے بارے میں جان کر خوشی ہوئی۔ ` +
      `ہم مل کر ${n} سوالات پر گفتگو کریں گے۔ واضح جواب دیں اور اپنا وقت لیں۔ شروع کرتے ہیں!`,
    tr:
      `Merhaba! Ben Lara, QudrahTech'in yapay zeka görüşmecisiyim. Bugün sizi tanımak için heyecanlıyım. ` +
      `Birlikte ${n} sorudan geçeceğiz. Her soruyu açıkça yanıtlayın ve acele etmeyin. Başlayalım!`,
  };
  return intros[normalizeInterviewLocale(locale)];
}

export function pickQuestionText(
  item: { question: string; questionAr: string },
  locale: string,
): string {
  const loc = normalizeInterviewLocale(locale);
  if (loc === "ar") {
    return item.questionAr?.trim() || item.question;
  }
  return item.question?.trim() || item.questionAr;
}
