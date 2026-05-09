"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function ApplicationScoreBadge({ score }: { score: number | null }) {
  const t = useTranslations("dashboard");

  if (score === null) {
    return (
      <Badge variant="neutral" size="sm" className="font-medium">
        {t("scoreNotRated")}
      </Badge>
    );
  }

  let variant: "success" | "warning" | "danger" = "danger";
  if (score > 70) variant = "success";
  else if (score >= 50) variant = "warning";

  return (
    <Badge variant={variant} size="sm" className={cn("min-w-[2.5rem] justify-center font-semibold tabular-nums")}>
      {score}
    </Badge>
  );
}
