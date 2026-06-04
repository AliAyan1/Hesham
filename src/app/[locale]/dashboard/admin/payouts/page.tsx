import { getTranslations } from "next-intl/server";
import AdminPayoutsPageClient from "./AdminPayoutsPageClient";

export default async function AdminPayoutsPage() {
  const t = await getTranslations("adminPanel.payoutsPage");
  return <AdminPayoutsPageClient title={t("title")} />;
}
