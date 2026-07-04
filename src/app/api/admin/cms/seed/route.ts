import { NextResponse } from "next/server";
import { getAllContentItems } from "@/lib/cms";
import { ensureSiteContentSeeded, resyncSiteContentDefaults } from "@/lib/cms-seed";
import { requireAdminApi } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const updatedBy = authResult.session.user.email ?? authResult.session.user.id;
    const seeded = await ensureSiteContentSeeded(updatedBy);
    const items = await getAllContentItems();

    return NextResponse.json({
      ok: true,
      seeded,
      total: items.length,
      keys: items.map((item) => item.key),
    });
  } catch (error) {
    console.error("[admin/cms/seed] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const updatedBy = authResult.session.user.email ?? authResult.session.user.id;
    const total = await resyncSiteContentDefaults(updatedBy);
    const items = await getAllContentItems();

    return NextResponse.json({
      ok: true,
      synced: total,
      total: items.length,
      keys: items.map((item) => item.key),
    });
  } catch (error) {
    console.error("[admin/cms/seed] resync failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
