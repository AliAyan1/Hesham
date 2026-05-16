import { TalentPoolReason } from "@prisma/client";

import { getPrisma } from "@/lib/db";

import { markUserInTalentPool } from "@/lib/talent-pool/sync-user-talent-pool";



/** Derive simple training tags from interview improvement titles for admin routing. */

function trainingTagsFromImprovements(improvements: Array<{ title?: string }> | null): object {

  if (!Array.isArray(improvements) || improvements.length === 0) {

    return { tags: ["general_training"] as string[] };

  }

  const tags = improvements

    .map((x) => (typeof x?.title === "string" ? x.title.trim() : ""))

    .filter(Boolean)

    .slice(0, 5);

  return { tags: tags.length ? tags : ["general_training"] };

}



export async function addTalentPoolEntry(params: {

  userId: string;

  reason: TalentPoolReason;

  sourceInterviewId?: string | null;

  sourceApplicationId?: string | null;

  improvements?: Array<{ title?: string }> | null;

}): Promise<void> {

  const prisma = getPrisma();

  const trainingTags = trainingTagsFromImprovements(params.improvements ?? null);



  if (params.reason === TalentPoolReason.INTERVIEW_LOW_SCORE && params.sourceInterviewId) {

    const exists = await prisma.talentPoolEntry.findFirst({

      where: { userId: params.userId, sourceInterviewId: params.sourceInterviewId },

      select: { id: true },

    });

    if (exists) return;

  }

  if (params.reason === TalentPoolReason.EMPLOYER_DECLINED && params.sourceApplicationId) {

    const exists = await prisma.talentPoolEntry.findFirst({

      where: { userId: params.userId, sourceApplicationId: params.sourceApplicationId },

      select: { id: true },

    });

    if (exists) return;

  }

  if (params.reason === TalentPoolReason.PROCTORING_VIOLATION) {

    const exists = await prisma.talentPoolEntry.findFirst({

      where: {

        userId: params.userId,

        reason: TalentPoolReason.PROCTORING_VIOLATION,

        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },

      },

      select: { id: true },

    });

    if (exists) return;

  }

  if (params.reason === TalentPoolReason.NOT_SELECTED_30_DAYS && params.sourceApplicationId) {

    const exists = await prisma.talentPoolEntry.findFirst({

      where: { userId: params.userId, sourceApplicationId: params.sourceApplicationId },

      select: { id: true },

    });

    if (exists) return;

  }

  if (

    params.reason === TalentPoolReason.ASSESSMENT_LOW_SCORE ||

    params.reason === TalentPoolReason.NO_ASSESSMENT

  ) {

    const exists = await prisma.talentPoolEntry.findFirst({

      where: { userId: params.userId, reason: params.reason },

      select: { id: true },

    });

    if (exists) {

      await markUserInTalentPool(params.userId, params.reason, new Date());

      return;

    }

  }



  const entry = await prisma.talentPoolEntry.create({

    data: {

      userId: params.userId,

      reason: params.reason,

      sourceInterviewId: params.sourceInterviewId ?? null,

      sourceApplicationId: params.sourceApplicationId ?? null,

      trainingTags,

    },

    select: { reason: true, createdAt: true },

  });



  await markUserInTalentPool(params.userId, entry.reason, entry.createdAt);

}


