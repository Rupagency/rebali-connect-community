import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, MessageCircle, UserCircle, Phone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ConfettiEffect from '@/components/ConfettiEffect';

const MEMBER_ONBOARDING_KEY = 'rebali-member-onboarding-done';

const steps = [
  { icon: UserCircle, translationKey: 'setupProfile', color: 'bg-primary/10 text-primary' },
  { icon: Phone, translationKey: 'verifyPhone', color: 'bg-green-500/10 text-green-600' },
  { icon: Camera, translationKey: 'firstListing', color: 'bg-accent/10 text-accent' },
  { icon: MessageCircle, translationKey: 'startChatting', color: 'bg-blue-500/10 text-blue-600' },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
};

export default function MemberOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLast = step === steps.length - 1;

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
      setDirection(1);
      setStep(step + 1);
    } else {
      handleClose();
      navigate('/profile');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none relative">
        {isLast && <ConfettiEffect />}
        <Progress value={progress} className="h-1 rounded-none" />

        <div className="p-6 pt-4 flex flex-col items-center text-center gap-4 min-h-[320px]">
          <div className="flex gap-1.5 mb-1">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                animate={{ width: i === step ? 24 : 6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`h-1.5 rounded-full ${i === step ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className={`w-20 h-20 rounded-2xl flex items-center justify-center ${currentStep.color.split(' ')[0]}`}
              >
                <Icon className={`w-10 h-10 ${currentStep.color.split(' ')[1]}`} />
              </motion.div>

              <h2 className="text-xl font-bold text-foreground">
                {t(`onboarding.member.${currentStep.translationKey}.title`)}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                {t(`onboarding.member.${currentStep.translationKey}.desc`)}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 w-full mt-auto pt-2">
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
