import { PublicLayout } from "@/components/layout/PublicLayout";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { InsightsPageClient } from "@/components/basalim/InsightsPageClient";

export default async function InsightsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <BasalimPageHero
        locale={locale}
        titleEn={"Ideas That Move\nPeople Forward."}
        titleAr={"المعرفة والرؤى —\nأفكار تُقدّم الناس إلى الأمام"}
        subtitleEn="Practical perspectives on people, leadership and the future of work in Saudi Arabia."
        subtitleAr="وجهات نظر عملية حول الناس والقيادة ومستقبل العمل في المملكة"
      />
      <InsightsPageClient locale={locale} />
    </PublicLayout>
  );
}
