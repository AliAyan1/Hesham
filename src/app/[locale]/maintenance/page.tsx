import { getPublicSettings } from "@/lib/settings";
import { Logo } from "@/components/ui/Logo";

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const settings = await getPublicSettings();
  const isRtl = locale === "ar" || locale === "ur";
  const message = isRtl ? settings.maintenanceMessageAr : settings.maintenanceMessage;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F4C75] to-[#0D2137] px-6 py-16 text-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur">
        <div className="flex justify-center">
          <Logo variant="dark" size="md" className="brightness-0 invert" />
        </div>
        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl">
          🔧
        </div>
        <h1 className="mt-6 text-3xl font-bold">
          {isRtl ? "سنعود قريباً!" : "We'll be back soon!"}
        </h1>
        <p className="mt-2 text-lg text-white/80">
          {isRtl ? settings.maintenanceMessageAr : "قدرتك تتحدث"}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-white/75">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-2 text-white/60" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
