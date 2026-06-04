import { getTranslations } from "next-intl/server";
import AdminAuditLogsClient from "./AdminAuditLogsClient";

export default async function AdminAuditLogsPage() {
  const t = await getTranslations("adminPanel.auditPage");
  return <AdminAuditLogsClient title={t("title")} />;
}
