"use client";

import { Bookmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

type SavedJobRow = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  savedAt: string;
};

export function SavedJobsClient() {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const [items, setItems] = useState<SavedJobRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/jobs/saved", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; data?: { items: SavedJobRow[] } };
      if (!res.ok || !json.success || !json.data) {
        throw new Error("load failed");
      }
      setItems(json.data.items);
    } catch {
      setError(true);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (items === null && !error) return <LoadingSkeleton rows={5} />;
  if (error || items === null) {
    return <ErrorState title={t("noJobs")} retryLabel={tc("retry")} onRetry={() => void load()} />;
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={<Bookmark className="mx-auto h-12 w-12 text-brand-teal" aria-hidden />}
        title={t("savedEmptyTitle")}
        description={t("savedEmptyDesc")}
        actionLabel={t("browseJobs")}
        onAction={() => {
          window.location.href = "/jobs";
        }}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((job) => (
        <li key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <Link href={`/dashboard/job-seeker/jobs/${job.id}`} className="block">
            <p className="font-semibold text-[#0D2137]">{job.title}</p>
            <p className="text-sm text-[#6B7280]">{job.companyName}</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {job.location ?? t("remote")} · {new Date(job.savedAt).toLocaleDateString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
