"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState, type HTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { avatarLettersOrNull } from "@/lib/avatar-initials";

type AvatarSize = "sm" | "md" | "lg" | "xl" | "profile";

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  profile: 112,
};

const sizeClass: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
  profile: "h-28 w-28 text-3xl",
};

const iconClass: Record<AvatarSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-10 w-10",
  profile: "h-14 w-14",
};

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  email: string;
  size?: AvatarSize;
  showOnline?: boolean;
  alt?: string;
}

export function Avatar({
  src,
  name,
  email,
  size = "md",
  showOnline = false,
  className,
  alt,
  ...rest
}: AvatarProps) {
  const t = useTranslations("common");
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;
  const dim = sizePx[size];
  const initials = avatarLettersOrNull(name, email);
  const showIcon = initials == null;

  return (
    <div className={cn("relative inline-flex shrink-0", className)} {...rest}>
      {showImage ? (
        <Image
          src={src as string}
          alt={alt ?? name ?? email}
          width={dim}
          height={dim}
          className={cn(
            "rounded-full object-cover ring-2 ring-white",
            sizeClass[size],
          )}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-brand-blue font-semibold text-white",
            sizeClass[size],
          )}
          aria-hidden={!(alt ?? name)}
        >
          {showIcon ? (
            <UserRound className={cn(iconClass[size])} strokeWidth={2} aria-hidden />
          ) : (
            initials
          )}
        </div>
      )}
      {showOnline ? (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
          aria-label={t("online")}
        />
      ) : null}
    </div>
  );
}
