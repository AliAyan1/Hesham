import { getTranslations } from "next-intl/server";
import AdminInterviewsClient from "./AdminInterviewsClient";

export default async function AdminInterviewsPage() {
  const t = await getTranslations("adminPanel.interviewsPage");
  return <AdminInterviewsClient title={t("title")} />;
}
