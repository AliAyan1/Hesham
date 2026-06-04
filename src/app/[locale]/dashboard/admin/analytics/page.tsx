import { getTranslations } from "next-intl/server";
import AdminAnalyticsPageClient from "./AdminAnalyticsPageClient";

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("adminPanel.analyticsPage");
  return <AdminAnalyticsPageClient title={t("title")} />;
}
