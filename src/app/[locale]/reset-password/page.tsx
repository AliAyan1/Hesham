import { redirect } from "next/navigation";

export default async function ResetPasswordAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  redirect(`/${locale}/auth/reset-password${qs}`);
}
