import { getTranslations } from "next-intl/server";
import AdminAssessmentsClient from "./AdminAssessmentsClient";

export default async function AdminAssessmentsPage() {
  const t = await getTranslations("adminPanel.assessmentsPage");
  return <AdminAssessmentsClient title={t("title")} />;
}
