export type CmsSectionDef = {
  id: string;
  icon: string;
  label: string;
  previewHref: string;
};

export const CMS_SECTION_DEFS: CmsSectionDef[] = [
  { id: "landing", icon: "🏠", label: "Landing Page", previewHref: "/" },
  { id: "about", icon: "📋", label: "About Page", previewHref: "/about" },
  { id: "contact", icon: "📞", label: "Contact Page", previewHref: "/contact" },
  { id: "faq", icon: "❓", label: "FAQ Questions", previewHref: "/#faq" },
  {
    id: "platform",
    icon: "⚙️",
    label: "Platform Messages",
    previewHref: "/dashboard/job-seeker/assessment",
  },
];

export function cmsSectionLabel(sectionId: string): string {
  return CMS_SECTION_DEFS.find((section) => section.id === sectionId)?.label ?? sectionId;
}
