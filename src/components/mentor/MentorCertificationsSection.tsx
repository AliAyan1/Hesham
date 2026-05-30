"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { MentorCertificationDto } from "@/lib/mentor/certification-types";
import { MENTOR_CERT_MAX_COUNT } from "@/lib/mentor/certification-types";

type Props = {
  initial: MentorCertificationDto[];
  onChange?: (items: MentorCertificationDto[]) => void;
  readOnly?: boolean;
};

export function MentorCertificationsSection({ initial, onChange, readOnly = false }: Props) {
  const t = useTranslations("mentor");
  const [items, setItems] = useState<MentorCertificationDto[]>(initial);
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const sync = useCallback(
    (next: MentorCertificationDto[]) => {
      setItems(next);
      onChange?.(next);
    },
    [onChange],
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !name.trim()) {
      setError(t("certNameRequired"));
      return;
    }
    if (items.length >= MENTOR_CERT_MAX_COUNT) {
      setError(t("certMaxReached"));
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      if (issuer.trim()) fd.append("issuer", issuer.trim());
      if (issuedAt) fd.append("issuedAt", issuedAt);

      const res = await fetch("/api/mentor/certifications/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { certification: MentorCertificationDto };
      };
      if (!j.success || !j.data?.certification) {
        setError(j.error ?? t("certUploadFailed"));
        return;
      }
      sync([j.data.certification, ...items]);
      setName("");
      setIssuer("");
      setIssuedAt("");
    } catch {
      setError(t("certUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/mentor/certifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { success?: boolean };
      if (j.success) sync(items.filter((c) => c.id !== id));
    } catch {
      setError(t("certDeleteFailed"));
    }
  }

  function isImage(mime: string | null): boolean {
    return mime?.startsWith("image/") ?? false;
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-[#0D2137]">{t("certifications")}</h2>
      <p className="mt-1 text-xs text-[#6B7280]">{t("certificationsHint")}</p>

      {!readOnly ? (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-[#C9973A]/40 bg-[#FDF3E3]/30 p-4">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={t("certNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={t("certIssuerPlaceholder")}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
          <label className="block text-xs font-medium text-[#374151]">
            {t("certIssuedDate")}
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0D2137] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Upload className="h-4 w-4" aria-hidden />
            {uploading ? t("certUploading") : t("certUploadFile")}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,image/jpeg,image/png,image/webp"
              disabled={uploading || !name.trim()}
              onChange={(e) => void handleUpload(e)}
            />
          </label>
          <p className="text-[10px] text-[#6B7280]">{t("certFormats")}</p>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B7280]">{t("certEmpty")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-lg border border-[#EEF2F7] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0D2137]">{c.name}</p>
                  {c.issuer ? <p className="text-xs text-[#6B7280]">{c.issuer}</p> : null}
                  {c.issuedAt ? (
                    <p className="text-xs text-[#6B7280]">
                      {new Date(c.issuedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label={t("certRemove")}
                    onClick={() => void remove(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <a
                href={c.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-teal underline"
              >
                {isImage(c.mimeType) ? (
                  <img
                    src={c.fileUrl}
                    alt=""
                    className="h-16 w-full max-w-[200px] rounded object-cover"
                  />
                ) : (
                  <>
                    <FileText className="h-5 w-5 shrink-0" aria-hidden />
                    {t("certViewPdf")}
                  </>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
