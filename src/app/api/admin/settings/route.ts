import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { clearCache as clearCmsCache } from "@/lib/cms";
import {
  clearSettingsCache,
  getSettings,
  toSettingsDto,
  type PlatformSettingsDto,
} from "@/lib/settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";

const updateSchema = z
  .object({
    platformName: z.string().trim().min(1).max(120).optional(),
    platformNameAr: z.string().trim().min(1).max(120).optional(),
    platformUrl: z.string().trim().url().optional(),
    supportEmail: z.string().trim().email().optional(),
    proPlanPrice: z.number().min(0).optional(),
    premiumPlanPrice: z.number().min(0).optional(),
    vatPercentage: z.number().min(0).max(100).optional(),
    mentorCommission: z.number().min(0).max(100).optional(),
    mentorPayout: z.number().min(0).max(100).optional(),
    assessmentPassScore: z.number().int().min(0).max(100).optional(),
    assessmentRetakeLimit: z.number().int().min(0).max(20).optional(),
    interviewQuestionCount: z.number().int().min(1).max(30).optional(),
    talentPoolMinScore: z.number().int().min(0).max(100).optional(),
    talentPoolMinProfile: z.number().int().min(0).max(100).optional(),
    isRegistrationOpen: z.boolean().optional(),
    isMentorMarketOpen: z.boolean().optional(),
    isAssessmentRequired: z.boolean().optional(),
    isProctorEnabled: z.boolean().optional(),
    isMaintenanceMode: z.boolean().optional(),
    sendWelcomeEmail: z.boolean().optional(),
    sendAssessmentInvite: z.boolean().optional(),
    sendJobMatchEmail: z.boolean().optional(),
    sendAssessmentResults: z.boolean().optional(),
    sendApplicationStatus: z.boolean().optional(),
    sendInterviewInvite: z.boolean().optional(),
    sendOfferLetter: z.boolean().optional(),
    sendSessionReminder: z.boolean().optional(),
    maxJobsPerEmployer: z.number().int().min(1).max(1000).optional(),
    maxApplicationsPerJob: z.number().int().min(1).max(100000).optional(),
    freeUserJobAlerts: z.number().int().min(0).max(100).optional(),
    maintenanceMessage: z.string().max(2000).optional(),
    maintenanceMessageAr: z.string().max(2000).optional(),
  })
  .strict();

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const settings = await getSettings();
    return NextResponse.json(
      { ok: true, settings: toSettingsDto(settings) },
      { headers: adminCacheHeaders() },
    );
  } catch (error) {
    console.error("[admin/settings] GET failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    const before = await getSettings();
    const beforeDto = toSettingsDto(before);

    const data = { ...parsed.data };
    if (data.mentorCommission != null) {
      data.mentorPayout = 100 - data.mentorCommission;
    } else if (data.mentorPayout != null) {
      data.mentorCommission = 100 - data.mentorPayout;
    }

    const updatedBy =
      authResult.session.user.email ?? authResult.session.user.id ?? "admin";

    let row;
    if (before.id === "defaults") {
      row = await prisma.platformSettings.create({
        data: {
          ...DEFAULT_PLATFORM_SETTINGS,
          ...data,
          updatedBy,
        },
      });
    } else {
      row = await prisma.platformSettings.update({
        where: { id: before.id },
        data: {
          ...data,
          updatedBy,
        },
      });
    }

    clearSettingsCache();
    clearCmsCache();

    const settings = toSettingsDto(row);
    const changedFields = Object.keys(parsed.data);

    await logAudit({
      userId: authResult.session.user.id,
      action: "SETTINGS_UPDATE",
      entity: "PlatformSettings",
      entityId: row.id,
      oldData: pickChanged(beforeDto, changedFields),
      newData: pickChanged(settings, changedFields),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[admin/settings] PUT failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function pickChanged(
  settings: PlatformSettingsDto,
  fields: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in settings) {
      out[field] = settings[field as keyof PlatformSettingsDto];
    }
  }
  return out;
}
