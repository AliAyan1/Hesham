import { getTranslations } from "next-intl/server";
import AdminSessionsClient from "./AdminSessionsClient";

export default async function AdminSessionsPage() {
  const t = await getTranslations("session");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("adminSessions")}</h1>
      <AdminSessionsClient />
    </div>
  );
}
