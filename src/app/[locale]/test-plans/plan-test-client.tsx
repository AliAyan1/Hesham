"use client";

import { useTranslations } from "next-intl";
import axios from "axios";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

type Plan = "free" | "professional" | "premium";

export function PlanTestClient() {
  const t = useTranslations("subscription");
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go(plan: Plan) {
    setErr(null);
    startTransition(async () => {
      try {
        const tier =
          plan === "free" ? "FREE" : plan === "professional" ? "PROFESSIONAL" : "PREMIUM";
        await axios.post("/api/test/set-tier", { tier });
        router.push("/dashboard/job-seeker/cv-builder");
      } catch {
        setErr(t("upgradeError"));
      }
    });
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Button variant="outline" loading={pending} onClick={() => go("free")}>
          {t("free")}
        </Button>
        <Button variant="secondary" loading={pending} onClick={() => go("professional")}>
          {t("professional")}
        </Button>
        <Button loading={pending} onClick={() => go("premium")}>
          {t("premium")}
        </Button>
      </div>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      <p className="mt-4 text-xs text-[#6B7280]">{t("testSwitcherNote")}</p>
    </div>
  );
}

