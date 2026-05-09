import { UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { avatarLettersOrNull } from "@/lib/avatar-initials";

export function InitialsAvatar({
  name,
  email,
  className,
  size = "md",
}: {
  name: string | null;
  email: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const sizeCls = size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  const letters = avatarLettersOrNull(name, email);
  const iconCls = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] font-bold text-[#0F4C75]",
        letters == null ? "text-[#0F4C75]" : "",
        sizeCls,
        className,
      )}
      aria-hidden
    >
      {letters == null ? (
        <UserRound className={iconCls} strokeWidth={2} aria-hidden />
      ) : (
        letters
      )}
    </span>
  );
}
