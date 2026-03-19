import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'terms' | 'privacy';
}

const TERMS_SECTIONS = [
  'acceptance', 'description', 'eligibility', 'account', 'listings',
  'prohibited', 'intellectual', 'liability', 'indemnification',
  'governing', 'modification', 'contact'
];

const PRIVACY_SECTIONS = [
  'collection', 'usage', 'legalBasis', 'storage', 'sharing',
  'cookies', 'rights', 'children', 'security', 'international',
  'changes', 'contact'
];

export function LegalDialog({ open, onOpenChange, type }: LegalDialogProps) {
  const { t } = useLanguage();
  const sections = type === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const prefix = type === 'terms' ? 'legal.terms' : 'legal.privacy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {type === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('legal.lastUpdated')}: 19/03/2026
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] px-6 pb-6">
          <div className="space-y-5 pr-4">
            {sections.map((key, i) => (
              <section key={key}>
                <h3 className="font-semibold mb-1">{i + 1}. {t(`${prefix}.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{t(`${prefix}.${key}.text`)}</p>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
