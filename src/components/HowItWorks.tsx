import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Camera, MessageCircle, Handshake, Search, ShieldCheck, Heart, Zap, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const sellerSteps = [
  { icon: Camera, color: 'text-primary', bg: 'bg-primary/10' },
  { icon: MessageCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Handshake, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const buyerSteps = [
  { icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: Handshake, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const trustFeatures = [
  { icon: ShieldCheck, key: 'verified' },
  { icon: Ban, key: 'noFees' },
  { icon: Zap, key: 'instant' },
];

export default function HowItWorks() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="bg-card border-t border-border/50 py-16 mt-4">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{t('home.howItWorks')}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t('howItWorks.subtitle')}</p>
        </motion.div>

        {/* Dual timelines */}
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto mb-14">
          {/* Seller timeline */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-extrabold">V</span>
              {t('howItWorks.sellerTitle')}
            </h3>
            <div className="relative pl-8 border-l-2 border-primary/20 space-y-8">
              {sellerSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  className="relative"
                >
                  <div className={`absolute -left-[calc(1rem+1px)] top-1 w-8 h-8 rounded-full ${step.bg} flex items-center justify-center border-2 border-background`}>
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <div className="ml-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t('howItWorks.step')} {i + 1}
                    </span>
                    <h4 className="text-base font-bold mt-1">{t(`howItWorks.seller${i + 1}Title`)}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`howItWorks.seller${i + 1}Desc`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Buyer timeline */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 text-sm font-extrabold">A</span>
              {t('howItWorks.buyerTitle')}
            </h3>
            <div className="relative pl-8 border-l-2 border-blue-500/20 space-y-8">
              {buyerSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  className="relative"
                >
                  <div className={`absolute -left-[calc(1rem+1px)] top-1 w-8 h-8 rounded-full ${step.bg} flex items-center justify-center border-2 border-background`}>
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <div className="ml-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t('howItWorks.step')} {i + 1}
                    </span>
                    <h4 className="text-base font-bold mt-1">{t(`howItWorks.buyer${i + 1}Title`)}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`howItWorks.buyer${i + 1}Desc`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust & security bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 border border-border/50 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {trustFeatures.map((feat, i) => (
                <div key={i} className="flex items-start gap-3 text-left">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{t(`howItWorks.trust${i + 1}Title`)}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`howItWorks.trust${i + 1}Desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button
            size="lg"
            className="rounded-full px-8 font-bold shadow-md"
            onClick={() => navigate(user ? '/create' : '/auth')}
          >
            {t('howItWorks.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
