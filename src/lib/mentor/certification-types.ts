export type MentorCertificationDto = {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  createdAt: string;
};

export const MENTOR_CERT_MAX_COUNT = 10;
export const MENTOR_CERT_MAX_BYTES = 5 * 1024 * 1024;

export const MENTOR_CERT_ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
