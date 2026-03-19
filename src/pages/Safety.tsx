import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Eye, CreditCard, AlertTriangle, UserCheck, Phone, ShieldAlert, Lock } from 'lucide-react';

export default function Safety() {
  const { t } = useLanguage();

  const tips = [
    { icon: MapPin, key: 'meetPublic' },
    { icon: Eye, key: 'inspectFirst' },
    { icon: CreditCard, key: 'securePayment' },
    { icon: AlertTriangle, key: 'tooGoodToBeTrue' },
    { icon: UserCheck, key: 'verifyIdentity' },
    { icon: Phone, key: 'keepCommsOnPlatform' },
    { icon: ShieldAlert, key: 'reportSuspicious' },
    { icon: Lock, key: 'protectPersonalInfo' },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('safety.title')} url="/safety" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('safety.title') },
        ],
      }} />
      <h1 className="text-4xl font-bold mb-4">{t('safety.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('safety.intro')}</p>

      <div className="space-y-4">
        {tips.map((tip, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <tip.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t(`safety.${tip.key}Title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`safety.${tip.key}Desc`)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-2">{t('safety.emergencyTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('safety.emergencyText')}</p>
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
