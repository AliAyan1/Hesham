import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { InsightArticlePage } from "@/components/basalim/InsightArticlePage";
import { getArticle, relatedArticles } from "@/lib/basalim/insights-articles";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function InsightDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <PublicLayout locale={locale}>
      <InsightArticlePage locale={locale} article={article} related={relatedArticles(slug)} />
    </PublicLayout>
  );
}
