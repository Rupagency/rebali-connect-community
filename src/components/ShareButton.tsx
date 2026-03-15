import { Share2, Link2, Facebook, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { isNativePlatform } from '@/capacitor';
import { openExternal } from '@/lib/openExternal';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  /** 'icon' = round floating button, 'button' = text button, 'mini' = small icon on cards */
  variant?: 'icon' | 'button' | 'mini';
  className?: string;
}

export default function ShareButton({ url, title, text, variant = 'icon', className = '' }: ShareButtonProps) {
  const { t } = useLanguage();
  const shareUrl = `https://re-bali.com${url}`;
  const ogUrl = url.startsWith('/listing/')
    ? `https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/og-listing?id=${url.replace('/listing/', '')}`
    : shareUrl;

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title,
        text: text || title,
        url: shareUrl,
        dialogTitle: t('share.shareThis') || 'Share',
      });
    } catch {
      // User cancelled
    }
  };

  const handleWebShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url: shareUrl });
      } catch {
        // cancelled
      }
    }
  };

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    toast({ title: t('listing.linkCopied') || 'Link copied!' });
  };

  const shareFacebook = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb://share/?link=${encodeURIComponent(ogUrl)}`;
      setTimeout(() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`), 1200);
    } else {
      openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`);
    }
  };

  const shareWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openExternal(`https://wa.me/?text=${encodeURIComponent(ogUrl)}`);
  };

  // Mini variant for listing cards
  if (variant === 'mini') {
    if (isNativePlatform) {
      return (
        <button onClick={handleNativeShare} className={`p-1.5 rounded-full bg-card/90 backdrop-blur hover:bg-card transition-colors shadow-sm ${className}`}>
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      return (
        <button onClick={handleWebShare} className={`p-1.5 rounded-full bg-card/90 backdrop-blur hover:bg-card transition-colors shadow-sm ${className}`}>
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); }} className={`p-1.5 rounded-full bg-card/90 backdrop-blur hover:bg-card transition-colors shadow-sm ${className}`}>
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={copyLink}><Link2 className="h-4 w-4 mr-2" />{t('share.copyLink')}</DropdownMenuItem>
          <DropdownMenuItem onClick={shareFacebook}><Facebook className="h-4 w-4 mr-2" />{t('share.facebook')}</DropdownMenuItem>
          <DropdownMenuItem onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />{t('share.whatsapp')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button variant
  if (variant === 'button') {
    if (isNativePlatform) {
      return (
        <Button variant="outline" size="sm" onClick={handleNativeShare} className={`gap-1.5 ${className}`}>
          <Share2 className="h-4 w-4" />
          {t('common.share')}
        </Button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`gap-1.5 ${className}`}>
            <Share2 className="h-4 w-4" />
            {t('common.share')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={copyLink}><Link2 className="h-4 w-4 mr-2" />{t('share.copyLink')}</DropdownMenuItem>
          <DropdownMenuItem onClick={shareFacebook}><Facebook className="h-4 w-4 mr-2" />{t('share.facebook')}</DropdownMenuItem>
          <DropdownMenuItem onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />{t('share.whatsapp')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Icon variant (default) — used on listing detail
  if (isNativePlatform) {
    return (
      <button onClick={handleNativeShare} className={`w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-md ${className}`}>
        <Share2 className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-md ${className}`}>
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyLink}><Link2 className="h-4 w-4 mr-2" />{t('share.copyLink')}</DropdownMenuItem>
        <DropdownMenuItem onClick={shareFacebook}><Facebook className="h-4 w-4 mr-2" />{t('share.facebook')}</DropdownMenuItem>
        <DropdownMenuItem onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />{t('share.whatsapp')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
