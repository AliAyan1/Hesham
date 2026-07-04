import { getTranslations } from "next-intl/server";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";

export default async function AdminSubscriptionsPage() {
  const t = await getTranslations("adminPanel.subscriptionsPage");
  return <AdminSubscriptionsClient title={t("title")} />;
}
