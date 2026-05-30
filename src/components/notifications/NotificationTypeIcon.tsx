import type { NotificationDto } from "@/types/dashboard";

export function NotificationTypeIcon({ type }: { type: NotificationDto["type"] }) {
  switch (type) {
    case "JOB_MATCH":
      return <span className="text-brand-teal" aria-hidden>💼</span>;
    case "APPLICATION_UPDATE":
      return <span className="text-brand-blue" aria-hidden>📋</span>;
    case "ASSESSMENT_READY":
      return <span className="text-brand-teal" aria-hidden>🧠</span>;
    case "SESSION_REMINDER":
      return <span className="text-yellow-600" aria-hidden>⏰</span>;
    case "MENTOR_APPLICATION":
      return <span className="text-[#C9973A]" aria-hidden>🎓</span>;
    case "MENTOR_APPROVED":
      return <span className="text-emerald-600" aria-hidden>✓</span>;
    case "MENTOR_REJECTED":
      return <span className="text-red-600" aria-hidden>✕</span>;
    case "MENTOR_SESSION_REQUEST":
      return <span className="text-brand-teal" aria-hidden>📅</span>;
    case "MENTOR_SESSION_CONFIRMED":
      return <span className="text-emerald-600" aria-hidden>✓</span>;
    case "MENTOR_SESSION_COMPLETED":
      return <span className="text-[#7C3AED]" aria-hidden>⭐</span>;
    case "SYSTEM":
    default:
      return <span className="text-gray-600" aria-hidden>🔔</span>;
  }
}
