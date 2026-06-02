import { redirect } from "next/navigation";

export default async function LoginAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v)) v.forEach((vv) => qs.append(k, vv));
  }
  redirect(`/${locale}/auth/login${qs.toString() ? `?${qs.toString()}` : ""}`);
}

