import type { MentorCertification } from "@prisma/client";
import type { MentorCertificationDto } from "@/lib/mentor/certification-types";

export function serializeMentorCertification(row: MentorCertification): MentorCertificationDto {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    mimeType: row.mimeType,
    createdAt: row.createdAt.toISOString(),
  };
}
