import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, MessageCircle, UserCircle, Phone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const MEMBER_ONBOARDING_KEY = 'rebali-member-onboarding-done';

const steps = [
  { icon: UserCircle, translationKey: 'setupProfile', color: 'bg-primary/10 text-primary' },
  { icon: Phone, translationKey: 'verifyPhone', color: 'bg-green-500/10 text-green-600' },
  { icon: Camera, translationKey: 'firstListing', color: 'bg-accent/10 text-accent' },
  { icon: MessageCircle, translationKey: 'startChatting', color: 'bg-blue-500/10 text-blue-600' },
];

export default function MemberOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(MEMBER_ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClose = () => {
    localStorage.setItem(MEMBER_ONBOARDING_KEY, 'true');
    setOpen(false);
    setStep(0);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
      // Navigate to profile to start setup
      navigate('/profile');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const progress = ((step + 1) / steps.length) * 100;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none">
        <Progress value={progress} className="h-1 rounded-none" />

        <div className="p-6 pt-4 flex flex-col items-center text-center gap-4">
          {/* Step dots */}
          <div className="flex gap-1.5 mb-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${currentStep.color.split(' ')[0]}`}>
            <Icon className={`w-10 h-10 ${currentStep.color.split(' ')[1]}`} />
          </div>

          {/* Title & description */}
          <h2 className="text-xl font-bold text-foreground">
            {t(`onboarding.member.${currentStep.translationKey}.title`)}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            {t(`onboarding.member.${currentStep.translationKey}.desc`)}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 w-full mt-2">
            {step > 0 ? (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {t('common.back')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleClose} className="flex-1 text-muted-foreground">
                {t('onboarding.skip')}
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {isLast ? t('onboarding.member.goToProfile') : t('common.next')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
