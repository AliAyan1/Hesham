import Image from "next/image";
import { cn } from "@/lib/cn";

type HeshamFounderPhotoProps = {
  locale: string;
  className?: string;
  priority?: boolean;
};

export function HeshamFounderPhoto({ locale, className, priority }: HeshamFounderPhotoProps) {
  const isAr = locale === "ar";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white p-2 shadow-lg",
        className,
      )}
    >
      <Image
        src="/hesham-basalim.png"
        alt={isAr ? "هشام باسالم — المؤسس" : "Hesham Basalim — Founder"}
        fill
        priority={priority}
        className="object-contain object-center"
        sizes="(max-width: 1024px) 100vw, 420px"
      />
    </div>
  );
}
