"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OfferDto = {
  id: string;
  fileUrl: string;
  fileName: string;
  status: string;
  expiresAt: string;
  job: { title: string };
  employer: { employerProfile: { companyName: string | null } | null };
};

export default function OfferClient() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [row, setRow] = useState<OfferDto | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch(`/api/job-seeker/offers/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: OfferDto }>)
      .then((j) => {
        if (j.success && j.data) setRow(j.data);
      });
  }, [id]);

  async function respond(accept: boolean) {
    setLoading(true);
    await fetch(`/api/job-seeker/offers/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept, declineReason: accept ? undefined : declineReason }),
    });
    setLoading(false);
    window.location.reload();
  }

  if (!row) return <p className="text-sm text-[#6B7280]">Loading…</p>;

  const company = row.employer.employerProfile?.companyName ?? "Employer";
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-[#0D2137]">Job offer</h1>
      <p className="text-sm text-[#6B7280]">
        {company} — {row.job.title}
      </p>
      <p className="text-xs text-amber-800">Expires in {daysLeft} day(s)</p>
      <a href={row.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-teal underline">
        Download offer letter ({row.fileName})
      </a>
      {row.status === "PENDING" ? (
        <>
          <textarea
            className="w-full rounded-lg border p-3 text-sm"
            rows={3}
            placeholder="Decline reason (required if declining)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void respond(true)}
              className="flex-1 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void respond(false)}
              className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white"
            >
              Decline
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm font-medium">Status: {row.status}</p>
      )}
    </div>
  );
}
