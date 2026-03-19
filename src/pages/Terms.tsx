import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';

export default function Terms() {
  const { t } = useLanguage();

  const sections = [
    'acceptance', 'description', 'eligibility', 'account', 'listings',
    'prohibited', 'intellectual', 'liability', 'indemnification',
    'governing', 'modification', 'contact'
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SEOHead title={t('legal.termsTitle')} url="/terms" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('legal.termsTitle') },
        ],
      }} />
      <h1 className="text-3xl font-bold mb-4">{t('legal.termsTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-2">{t('legal.lastUpdated')}: 19/03/2026</p>
      <p className="text-sm text-muted-foreground mb-8">{t('legal.termsIntro')}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        {sections.map((key, i) => (
          <section key={key}>
            <h2 className="text-xl font-semibold mb-2">{i + 1}. {t(`legal.terms.${key}.title`)}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t(`legal.terms.${key}.text`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
