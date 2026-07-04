import { getTranslations } from "next-intl/server";
import AdminJobsClient from "./AdminJobsClient";

export default async function AdminJobsPage() {
  const t = await getTranslations("adminPanel.jobsPage");
  return <AdminJobsClient title={t("title")} />;
}
