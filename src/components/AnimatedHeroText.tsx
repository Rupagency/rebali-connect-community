import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const HERO_WORDS: Record<string, string[]> = {
  en: ['Re-Use', 'Re-Sell', 'Re-Home', 'Re-Discover'],
  fr: ['Re-Utilise', 'Re-Vends', 'Re-Trouve', 'Re-Découvre'],
  id: ['Re-Pakai', 'Re-Jual', 'Re-Temukan', 'Re-Gunakan'],
  es: ['Re-Usa', 'Re-Vende', 'Re-Encuentra', 'Re-Descubre'],
  zh: ['Re-用', 'Re-卖', 'Re-找', 'Re-发现'],
  de: ['Re-Nutze', 'Re-Verkaufe', 'Re-Finde', 'Re-Entdecke'],
  nl: ['Re-Gebruik', 'Re-Verkoop', 'Re-Vind', 'Re-Ontdek'],
  ru: ['Re-Используй', 'Re-Продай', 'Re-Найди', 'Re-Открой'],
};

export default function AnimatedHeroText() {
  const { language } = useLanguage();
  const words = HERO_WORDS[language] || HERO_WORDS.en;
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % words.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span
      className={`inline-block text-primary transition-all duration-300 ${
        fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {words[index]}
    </span>
  );
}
