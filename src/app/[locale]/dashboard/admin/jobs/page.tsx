import { getTranslations } from "next-intl/server";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export default async function AdminJobsPage() {
  const t = await getTranslations("adminPanel.nav");
  return <AdminPlaceholder title={t("jobs")} />;
}
