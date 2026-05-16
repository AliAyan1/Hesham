"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  poolReason: string | null;
  proctoringCooldownActive: boolean;
  proctoringSuspendedUntil: string | null;
  isRtl: boolean;
};

export function TalentPoolInviteBlockedDialog({
  open,
  onClose,
  candidateName,
  poolReason,
  proctoringCooldownActive,
  proctoringSuspendedUntil,
  isRtl,
}: Props) {
  const t = useTranslations("employerTalentPool");

  if (!open) return null;

  const untilLabel =
    proctoringSuspendedUntil && proctoringCooldownActive
      ? new Date(proctoringSuspendedUntil).toLocaleString(isRtl ? "ar" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const body =
    poolReason === "PROCTORING_VIOLATION" && proctoringCooldownActive && untilLabel
      ? t("nominateBlockedBodyProctoring", { name: candidateName, datetime: untilLabel })
      : poolReason === "PROCTORING_VIOLATION" && !proctoringCooldownActive
        ? t("nominateBlockedBodyProctoringReady", { name: candidateName })
        : t("nominateBlockedBodyGeneric", { name: candidateName });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="talent-pool-invite-blocked-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="talent-pool-invite-blocked-title" className="text-lg font-bold text-[#0D2137]">
          {t("nominateBlockedTitle")}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#374151]">{body}</p>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="primary" className="min-h-11" onClick={onClose}>
            {t("nominateBlockedOk")}
          </Button>
        </div>
      </div>
    </div>
  );
}
