import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';

export default function Rules() {
  const { t } = useLanguage();

  const rules = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('rules.title')} url="/rules" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('rules.title') },
        ],
      }} />
      <h1 className="text-4xl font-bold mb-4">{t('rules.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('rules.intro')}</p>

      <div className="space-y-3">
        {rules.map(i => (
          <Card key={i}>
            <CardContent className="p-4 flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {i}
              </span>
              <div>
                <p className="font-semibold text-sm">{t(`rules.rule${i}Title`)}</p>
                <p className="text-sm text-muted-foreground">{t(`rules.rule${i}Desc`)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">{t('rules.consequencesTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('rules.consequencesText')}</p>
        </CardContent>
      </Card>

      <Card className="mt-4 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground italic">{t('security.disclaimer')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
