"use client";

import axios from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  applicationId: string;
  candidateName: string;
};

export function OfferUploadSection({ applicationId, candidateName }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fee, setFee] = useState("5000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ offerId: string; obligationId: string } | null>(null);

  async function submit() {
    if (!file) {
      setError("Select a PDF offer letter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await axios.post<{ success: boolean; data?: { fileUrl: string; fileName: string } }>(
        "/api/employer/offers/upload",
        form,
      );
      if (!up.data.success || !up.data.data) {
        setError("Upload failed");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fileUrl = up.data.data.fileUrl.startsWith("http")
        ? up.data.data.fileUrl
        : `${origin}${up.data.data.fileUrl}`;

      const feeNum = Number(fee);
      const res = await axios.post<{
        success: boolean;
        data?: { offerId: string; obligationId: string };
        error?: string;
      }>("/api/employer/offers", {
        applicationId,
        fileUrl,
        fileName: up.data.data.fileName,
        ...(Number.isFinite(feeNum) && feeNum > 0 ? { recruitmentFee: feeNum } : {}),
      });
      if (!res.data.success || !res.data.data) {
        setError(res.data.error ?? "Could not send offer");
        return;
      }
      setSuccess(res.data.data);
    } catch {
      setError("Could not send offer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h2 className="font-bold text-emerald-900">Offer sent</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Offer letter sent to {candidateName}. Sign the obligation letter to continue hiring.
        </p>
        <a
          href={`/dashboard/employer/obligation/${success.obligationId}`}
          className="mt-4 inline-flex rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Sign obligation letter
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="font-bold text-[#0D2137]">Send offer letter</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Upload a PDF offer for {candidateName}. The candidate and obligation letter flow will start automatically.
      </p>
      <div className="mt-4 space-y-3">
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label className="block text-sm font-medium text-[#374151]">
          Recruitment fee (SAR)
          <input
            type="number"
            min={1}
            className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="button" loading={busy} disabled={!file} onClick={() => void submit()}>
          Send offer
        </Button>
      </div>
    </section>
  );
}
