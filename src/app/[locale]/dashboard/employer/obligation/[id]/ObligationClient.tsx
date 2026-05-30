"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ObligationDto = {
  id: string;
  recruitmentFee: number;
  currency: string;
  terms: string;
  status: string;
  candidate: { name: string | null };
  job: { title: string };
  vatAmount?: number;
  totalAmount?: number;
};

export default function ObligationClient() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [row, setRow] = useState<ObligationDto | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void fetch(`/api/employer/obligation/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: ObligationDto }>)
      .then((j) => {
        if (j.success && j.data) setRow(j.data);
      });
  }, [id]);

  async function sign() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/employer/obligation/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedByName: name.trim() }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
  }

  if (!row) return <p className="text-sm text-[#6B7280]">Loading…</p>;
  if (done) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        Obligation signed and payment recorded. You can proceed with the offer.
      </p>
    );
  }

  const vat = row.vatAmount ?? row.recruitmentFee * 0.15;
  const total = row.totalAmount ?? row.recruitmentFee + vat;

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-[#0D2137]">Obligation letter</h1>
      <p className="text-sm text-[#6B7280]">
        {row.candidate.name} — {row.job.title}
      </p>
      <ul className="text-sm text-[#374151]">
        <li>Recruitment fee: {row.recruitmentFee} {row.currency}</li>
        <li>VAT (15%): {vat.toFixed(2)} {row.currency}</li>
        <li className="font-semibold">Total: {total.toFixed(2)} {row.currency}</li>
      </ul>
      <p className="whitespace-pre-wrap text-sm text-[#374151]">{row.terms}</p>
      <label className="block text-sm font-medium">Digital signature (full name)</label>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        disabled={loading || !name.trim()}
        onClick={() => void sign()}
        className="w-full rounded-lg bg-[#0F4C75] py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Signing…" : "I agree and sign"}
      </button>
    </div>
  );
}
