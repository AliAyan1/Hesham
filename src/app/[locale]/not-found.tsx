import { Link } from "@/i18n/navigation";
import { BasalimLogo } from "@/components/layout/BasalimLogo";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#F5F3EE] px-6 text-center">
      <BasalimLogo compact priority />
      <div>
        <h1 className="text-2xl font-bold text-[#0D1F2D]">Page not found</h1>
        <p className="mt-2 text-sm text-[#6B7280]" dir="rtl">
          الصفحة غير موجودة
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[#1A6B5A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#155A4A]"
        >
          Home / الرئيسية
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-[#0D1F2D]/20 px-6 py-3 text-sm font-semibold text-[#0D1F2D] hover:bg-white"
        >
          Contact
        </Link>
        <Link
          href="/qudrahtech"
          className="rounded-lg border border-[#0D1F2D]/20 px-6 py-3 text-sm font-semibold text-[#0D1F2D] hover:bg-white"
        >
          Qudrahtech
        </Link>
      </div>
    </div>
  );
}
