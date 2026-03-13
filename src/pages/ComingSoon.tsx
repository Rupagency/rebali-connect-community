import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Rocket, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LAUNCH_DATE = new Date('2026-04-01T00:00:00+08:00');

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function ComingSoon() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const countdown = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
      <div className="bg-card border rounded-xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shadow-lg">
        <span className="text-2xl sm:text-3xl font-bold text-primary">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <>
      <SEOHead title="Coming Soon — Re-Bali" description="Re-Bali is launching soon. Join the waitlist!" />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6">
          <Rocket className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Re-Bali
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {t('comingSoon.tagline')}
          </p>
        </div>

        <div className="flex gap-3 sm:gap-4 mb-10">
          <CountdownBlock value={countdown.days} label={t('comingSoon.days')} />
          <CountdownBlock value={countdown.hours} label={t('comingSoon.hours')} />
          <CountdownBlock value={countdown.minutes} label={t('comingSoon.minutes')} />
          <CountdownBlock value={countdown.seconds} label={t('comingSoon.seconds')} />
        </div>

        {submitted ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{t('comingSoon.confirmed')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('comingSoon.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('comingSoon.joinWaitlist')}
            </Button>
          </form>
        )}

        <p className="text-xs text-muted-foreground mt-6 max-w-sm">
          {t('comingSoon.disclaimer')}
        </p>
      </div>
    </>
  );
}
