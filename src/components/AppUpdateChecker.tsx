import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

function compareVersions(current: string, required: string): number {
  const a = current.split('.').map(Number);
  const b = required.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function AppUpdateChecker() {
  const { t } = useLanguage();
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const check = async () => {
      try {
        const info = await CapApp.getInfo();
        const currentVersion = info.version; // e.g. "1.0.0"
        const platform = Capacitor.getPlatform(); // "ios" | "android"

        const versionKey = platform === 'ios' ? 'min_version_ios' : 'min_version_android';
        const urlKey = platform === 'ios' ? 'store_url_ios' : 'store_url_android';

        const { data } = await supabase
          .from('app_config')
          .select('key, value')
          .in('key', [versionKey, urlKey]);

        if (!data) return;

        const minVersion = data.find(r => r.key === versionKey)?.value;
        const url = data.find(r => r.key === urlKey)?.value;

        if (minVersion && compareVersions(currentVersion, minVersion) < 0) {
          setStoreUrl(url || '');
          setNeedsUpdate(true);
        }
      } catch (err) {
        console.error('Update check failed:', err);
      }
    };

    check();
  }, []);

  const handleUpdate = () => {
    if (storeUrl) {
      window.open(storeUrl, '_system');
    }
  };

  if (!needsUpdate) return null;

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-sm [&>button]:hidden">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            {t('update.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('update.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button onClick={handleUpdate} className="w-full font-bold">
            {t('update.button')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
