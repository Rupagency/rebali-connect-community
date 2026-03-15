import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, Shield, Zap, Globe, MessageCircle, Users, Star, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, useScroll, useTransform } from 'framer-motion';
import baliHero from '@/assets/bali-hero.jpg';
import logo from '@/assets/logo.png';

const LAUNCH_DATE = new Date('2026-04-01T00:00:00+08:00');

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('waitlist').select('id', { count: 'exact', head: true }).then(({ count: c }) => {
      setCount(c ?? 0);
    });
    // Real-time subscription
    const channel = supabase.channel('waitlist-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waitlist' }, () => {
        setCount(prev => (prev ?? 0) + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return count;
}

const FEATURES = [
  { icon: Zap, titleKey: 'feature1Title', descKey: 'feature1Desc', color: 'text-primary' },
  { icon: Shield, titleKey: 'feature2Title', descKey: 'feature2Desc', color: 'text-green-500' },
  { icon: Globe, titleKey: 'feature3Title', descKey: 'feature3Desc', color: 'text-accent' },
  { icon: MessageCircle, titleKey: 'feature4Title', descKey: 'feature4Desc', color: 'text-blue-500' },
];

const TESTIMONIALS = [
  { key: 'testimonial1', authorKey: 'testimonial1Author', avatar: '👩‍💼' },
  { key: 'testimonial2', authorKey: 'testimonial2Author', avatar: '👨‍🦱' },
  { key: 'testimonial3', authorKey: 'testimonial3Author', avatar: '🧑‍💻' },
];

export default function ComingSoon() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const countdown = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const waitlistCount = useWaitlistCount();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('waitlist' as any).insert({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error?.code === '23505') {
      toast({ title: t('comingSoon.alreadyRegistered') });
      setSubmitted(true);
      return;
    }
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSubmitted(true);
    toast({ title: t('comingSoon.success') });
  };

  const CountdownBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.15, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shadow-lg"
      >
        <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </motion.div>
      <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 uppercase tracking-widest font-semibold">{label}</span>
    </div>
  );

  return (
    <>
      <SEOHead title="Coming Soon — Re-Bali" description="Re-Bali is launching soon. Join the waitlist!" />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 -z-10">
          <img src={baliHero} alt="Bali landscape" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        </motion.div>

        <div className="relative z-10 text-center px-4 py-20 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <img src={logo} alt="Re-Bali" className="h-16 sm:h-20 mx-auto mb-6" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 text-foreground leading-tight">
              {t('comingSoon.tagline')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto mb-2">
              {t('comingSoon.subtitle')}
            </p>
            <p className="text-sm font-semibold text-primary mb-8">
              {t('comingSoon.launchDate')}
            </p>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex justify-center gap-3 sm:gap-5 mb-8"
          >
            <CountdownBlock value={countdown.days} label={t('comingSoon.days')} />
            <CountdownBlock value={countdown.hours} label={t('comingSoon.hours')} />
            <CountdownBlock value={countdown.minutes} label={t('comingSoon.minutes')} />
            <CountdownBlock value={countdown.seconds} label={t('comingSoon.seconds')} />
          </motion.div>

          {/* Waitlist count */}
          {waitlistCount !== null && waitlistCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t('comingSoon.waitlistCount').replace('{count}', waitlistCount.toLocaleString())}
              </span>
            </motion.div>
          )}

          {/* Email form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-md mx-auto"
          >
            {submitted ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl p-4"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">{t('comingSoon.confirmed')}</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t('comingSoon.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-card/80 backdrop-blur-sm border-border/50 text-base"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} size="lg" className="h-12 px-8 text-base font-bold">
                  {loading ? t('common.loading') : t('comingSoon.joinWaitlist')}
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-3">{t('comingSoon.disclaimer')}</p>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ChevronDown className="h-6 w-6 text-muted-foreground mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-black text-center mb-14 text-foreground"
          >
            {t('comingSoon.features')}
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.titleKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border/50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-muted mb-4`}>
                  <f.icon className={`h-7 w-7 ${f.color}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{t(`comingSoon.${f.titleKey}`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`comingSoon.${f.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t_item, i) => (
              <motion.div
                key={t_item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground font-medium italic flex-1 mb-4">
                  "{t(`comingSoon.${t_item.key}`)}"
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t_item.avatar}</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {t(`comingSoon.${t_item.authorKey}`)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4">
            {t('comingSoon.joinWaitlist')}
          </h2>
          {waitlistCount !== null && waitlistCount > 0 && (
            <p className="text-sm text-muted-foreground mb-6 flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t('comingSoon.waitlistCount').replace('{count}', waitlistCount.toLocaleString())}
            </p>
          )}
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">{t('comingSoon.confirmed')}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t('comingSoon.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-base"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="h-12 px-8 text-base font-bold">
                {loading ? t('common.loading') : t('comingSoon.joinWaitlist')}
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
