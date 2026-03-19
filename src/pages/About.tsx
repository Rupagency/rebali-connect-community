import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, Shield, Users, Globe, Recycle, HandshakeIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function About() {
  const { t } = useLanguage();

  const values = [
    { icon: Shield, titleKey: 'about.trust', descKey: 'about.trustText' },
    { icon: Recycle, titleKey: 'about.sustainability', descKey: 'about.sustainabilityText' },
    { icon: Users, titleKey: 'about.community', descKey: 'about.communityText' },
    { icon: Globe, titleKey: 'about.inclusivity', descKey: 'about.inclusivityText' },
    { icon: Heart, titleKey: 'about.transparency', descKey: 'about.transparencyText' },
    { icon: HandshakeIcon, titleKey: 'about.fairTrade', descKey: 'about.fairTradeText' },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('about.title')} description={t('about.description')} url="/about" jsonLd={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Re-Bali",
        url: "https://re-bali.com",
        description: t('about.description'),
        foundingDate: "2026",
        areaServed: { "@type": "Place", name: "Bali, Indonesia" },
      }} />
      <h1 className="text-4xl font-bold mb-4">{t('about.title')}</h1>
      <p className="text-lg text-muted-foreground mb-8">{t('about.description')}</p>

      <h2 className="text-2xl font-bold mb-3">{t('about.mission')}</h2>
      <p className="text-muted-foreground mb-4">{t('about.missionText')}</p>

      <h2 className="text-2xl font-bold mb-3">{t('about.whatWeDo')}</h2>
      <p className="text-muted-foreground mb-4">{t('about.whatWeDoText')}</p>

      <h2 className="text-2xl font-bold mb-3">{t('about.whoWeServe')}</h2>
      <p className="text-muted-foreground mb-10">{t('about.whoWeServeText')}</p>

      <h2 className="text-2xl font-bold mb-6">{t('about.values')}</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {values.map((v, i) => (
          <Card key={i}>
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <v.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t(v.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(v.descKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">{t('about.legalEntity')}</h3>
          <p className="text-sm text-muted-foreground">{t('about.legalEntityText')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
