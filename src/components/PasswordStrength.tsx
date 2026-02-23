import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const COLORS = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-600'];
const LABELS: Record<string, string[]> = {
  en: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'],
  fr: ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'],
};

export function PasswordStrength({ password }: { password: string }) {
  const { language } = useLanguage();
  const strength = useMemo(() => getStrength(password), [password]);
  const labels = LABELS[language] || LABELS.en;

  if (!password) return null;

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength - 1 ? COLORS[strength] : 'bg-muted'}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[strength]}</p>
    </div>
  );
}
