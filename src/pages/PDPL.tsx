import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function PDPL() {
  const { t } = useLanguage();

  const sections = [
    'overview', 'scope', 'dataController', 'dataCollected',
    'processingBasis', 'dataSubjectRights', 'retention',
    'crossBorder', 'breach', 'dpo', 'contact'
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SEOHead title={t('pdpl.title')} url="/pdpl" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('pdpl.title') },
        ],
      }} />

      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t('pdpl.title')}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{t('legal.lastUpdated')}: 19/03/2026</p>
      <p className="text-muted-foreground mb-8">{t('pdpl.intro')}</p>

      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm font-medium">{t('pdpl.lawReference')}</p>
        </CardContent>
      </Card>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        {sections.map((key, i) => (
          <section key={key}>
            <h2 className="text-xl font-semibold mb-2">{i + 1}. {t(`pdpl.${key}.title`)}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t(`pdpl.${key}.text`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
