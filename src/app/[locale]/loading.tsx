import Image from "next/image";

export default function LocaleLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-white px-6">
      <Image src="/logo.png" alt="QudrahTech" width={180} height={58} priority className="h-auto w-auto" />
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#0F4C75]" aria-label="Loading" />
    </div>
  );
}

