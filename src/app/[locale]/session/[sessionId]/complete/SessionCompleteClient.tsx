"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function SessionCompleteClient({
  sessionId,
  role,
}: {
  sessionId: string;
  role: "JOBSEEKER" | "MENTOR";
}) {
  const t = useTranslations("session");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (role !== "JOBSEEKER") {
      router.push("/dashboard/mentor/sessions");
      return;
    }
    if (rating < 1) {
      setError(t("ratingRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: review.trim() || undefined }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!j.success) {
        setError(j.error ?? t("submitFailed"));
        return;
      }
      router.push("/dashboard/job-seeker/sessions");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    router.push(role === "MENTOR" ? "/dashboard/mentor/sessions" : "/dashboard/job-seeker/sessions");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-8 text-center">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("complete")} ✅</h1>
      {role === "JOBSEEKER" ? (
        <>
          <p className="text-sm text-[#6B7280]">{t("rating")}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`text-3xl ${n <= rating ? "text-[#C9973A]" : "text-gray-300"}`}
                onClick={() => setRating(n)}
                aria-label={`${n}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="w-full rounded-lg border p-3 text-sm"
            rows={4}
            placeholder={t("reviewPlaceholder")}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="button" className="w-full" loading={busy} onClick={() => void submit()}>
            {t("submitReview")}
          </Button>
        </>
      ) : (
        <p className="text-sm text-[#6B7280]">{t("mentorCompleteHint")}</p>
      )}
      <button type="button" className="text-sm text-[#6B7280] underline" onClick={skip}>
        {t("skip")}
      </button>
    </div>
  );
}
