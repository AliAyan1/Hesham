import { getTranslations } from "next-intl/server";
import AdminRevenueClient from "./AdminRevenueClient";

export default async function AdminRevenuePage() {
  const t = await getTranslations("adminPanel.revenuePage");
  return <AdminRevenueClient title={t("title")} />;
}
