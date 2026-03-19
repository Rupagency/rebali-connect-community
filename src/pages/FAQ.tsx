import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Shield, CreditCard, BadgeCheck, User, Scale } from 'lucide-react';

const SECTIONS = [
  { key: 'howItWorks', icon: HelpCircle, questions: ['q1', 'q2', 'q3', 'q4', 'q5'] },
  { key: 'safety', icon: Shield, questions: ['q1', 'q2', 'q3', 'q4'] },
  { key: 'payments', icon: CreditCard, questions: ['q1', 'q2', 'q3'] },
  { key: 'verification', icon: BadgeCheck, questions: ['q1', 'q2', 'q3'] },
  { key: 'account', icon: User, questions: ['q1', 'q2', 'q3'] },
  { key: 'legal', icon: Scale, questions: ['q1', 'q2', 'q3'] },
];

export default function FAQ() {
  const { t } = useLanguage();

  return (
    <>
      <SEOHead
        title={t('faq.title') + ' — Re-Bali'}
        description={t('faq.subtitle')}
        url="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SECTIONS.flatMap(section =>
            section.questions.map(q => ({
              "@type": "Question",
              name: t(`faq.${section.key}.${q}.q`),
              acceptedAnswer: { "@type": "Answer", text: t(`faq.${section.key}.${q}.a`) }
            }))
          )
        }}
      />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{t('faq.title')}</h1>
        <p className="text-muted-foreground mb-8">{t('faq.subtitle')}</p>

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">{t(`faq.${section.key}.title`)}</h2>
                </div>
                <Accordion type="multiple" className="border rounded-lg">
                  {section.questions.map((q) => (
                    <AccordionItem key={q} value={`${section.key}-${q}`}>
                      <AccordionTrigger className="px-4 text-left">
                        {t(`faq.${section.key}.${q}.q`)}
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        {t(`faq.${section.key}.${q}.a`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
