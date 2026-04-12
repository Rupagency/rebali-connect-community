import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CATEGORIES, CATEGORY_TREE, LOCATIONS, LOCATION_GROUPS, CONDITIONS,
  CATEGORY_ICONS, CATEGORY_FIELDS, SUBCATEGORY_FIELDS,
  CATEGORIES_WITHOUT_CONDITION, CATEGORIES_WITH_RENTAL,
  SUBCATEGORIES_FORCE_RENT, SUBCATEGORIES_FORCE_SALE,
  LOCATION_COORDS, getDistanceKm,
} from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { Upload, X, MapPin, Loader2, ShieldCheck, Layers, CheckCircle2 } from 'lucide-react';
import { useProStatus } from '@/hooks/useProStatus';
import { isNativePlatform } from '@/capacitor';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { trackEvent } from '@/lib/analytics';

export default function BulkCreateListing() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { tier, maxPhotos: proMaxPhotos } = useProStatus();

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (tier !== 'agence') { navigate('/create', { replace: true }); }
  }, [user, tier, navigate]);

  const [loading, setLoading] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStep, setPublishStep] = useState('');
  const [sessionCount, setSessionCount] = useState(0);

  const [form, setForm] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    price: '',
    currency: 'IDR',
    location: '',
    condition: 'good',
    listing_type: 'sale',
  });
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const computeImageHash = async (file: File | Blob): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const addWatermark = async (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const w = img.width, h = img.height;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const shortSide = Math.min(w, h);
        const fontSize = Math.max(12, Math.round(shortSide / 50));
        const text = 'Re-Bali.com';
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = Math.max(0.5, fontSize / 16);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const angle = -25 * (Math.PI / 180);
        const metrics = ctx.measureText(text);
        const textW = metrics.width + fontSize * 6;
        const textH = fontSize * 6;
        const diagonal = Math.sqrt(w * w + h * h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        for (let row = -diagonal; row < diagonal; row += textH) {
          for (let col = -diagonal; col < diagonal; col += textW) {
            ctx.strokeText(text, col, row);
            ctx.fillText(text, col, row);
          }
        }
        ctx.restore();
        canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', 0.9);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const triggerTranslation = async (listingId: string) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { error } = await supabase.functions.invoke('translate-listing', { body: { listing_id: listingId } });
      if (!error) return;
      if (attempt < 2) await new Promise(r => setTimeout(r, 800));
    }
  };

  const SUSPICIOUS_PATTERNS = [
    /wa\.me\//i, /t\.me\//i, /bit\.ly\//i, /tinyurl\.com/i,
    /https?:\/\/[^\s]+/i, /telegram/i, /whatsapp\.com/i, /signal\.me/i,
  ];
  const PHONE_PATTERN = /(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,5}/;
  const RAW_DIGITS_PATTERN = /\b\d{8,15}\b/;
  const INDONESIAN_PRICE_PATTERN = /\b\d{1,3}(\.\d{3}){1,4}\b/g;
  const checkContent = (text: string): boolean => {
    const cleaned = text.replace(INDONESIAN_PRICE_PATTERN, '');
    return SUSPICIOUS_PATTERNS.some(p => p.test(text)) || PHONE_PATTERN.test(cleaned) || RAW_DIGITS_PATTERN.test(cleaned);
  };

  const titleBad = checkContent(form.title);
  const descBad = checkContent(form.description);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = proMaxPhotos - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }, [photos, proMaxPhotos]);

  const handleNativePhoto = useCallback(async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      const isAndroid = Capacitor.getPlatform() === 'android';
      const image = await Camera.getPhoto({
        quality: 85, allowEditing: false,
        resultType: isAndroid ? CameraResultType.DataUrl : CameraResultType.Uri,
        source: CameraSource.Prompt, width: 1200, height: 1200,
      });
      if (isAndroid && image.dataUrl) {
        const res = await fetch(image.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotos(prev => [...prev, file]);
        setPreviews(prev => [...prev, image.dataUrl!]);
      } else if (image.webPath) {
        const res = await fetch(image.webPath);
        const blob = await res.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotos(prev => [...prev, file]);
        setPreviews(prev => [...prev, image.webPath!]);
      }
    } catch (err: any) {
      if (err?.message !== 'User cancelled photos app') console.error('Camera error:', err);
    }
  }, []);

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const canSubmit = () => {
    const isNegotiable = form.category === 'emploi' && extraFields.salary_negotiable === 'true';
    return !!form.category && !!form.subcategory && !!form.title && !!form.description
      && (isNegotiable || form.price !== '') && !!form.location
      && photos.length > 0 && !titleBad && !descBad && !loading;
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit()) return;
    setLoading(true);
    setPublishProgress(10);
    setPublishStep(t('publish.progress.creating'));

    try {
      const { data: listing, error } = await supabase.from('listings').insert({
        seller_id: user.id,
        category: form.category as any,
        subcategory: form.subcategory,
        title_original: form.title,
        description_original: form.description,
        lang_original: language,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        location_area: form.location,
        condition: form.condition as any,
        status: 'active',
        extra_fields: extraFields,
        listing_type: form.listing_type,
      } as any).select().single();

      if (error) throw error;

      setPublishStep(t('publish.progress.uploading'));
      for (let i = 0; i < photos.length; i++) {
        setPublishProgress(15 + Math.round((i / Math.max(photos.length, 1)) * 55));
        const imageHash = await computeImageHash(photos[i]);
        const watermarked = await addWatermark(photos[i]);
        const originalBlob = await new Promise<Blob>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img2 = new Image();
            img2.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img2.width; canvas.height = img2.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img2, 0, 0);
              canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', 0.9);
            };
            img2.src = reader.result as string;
          };
          reader.readAsDataURL(photos[i]);
        });
        const path = `${user.id}/${listing.id}/${i}.jpg`;
        const wmPath = `${user.id}/${listing.id}/${i}_wm.jpg`;
        await supabase.storage.from('listings').upload(path, originalBlob);
        await supabase.storage.from('listings').upload(wmPath, watermarked);
        await supabase.from('listing_images').insert({
          listing_id: listing.id,
          storage_path: path,
          sort_order: i,
          image_hash: imageHash,
        } as any);
      }

      setPublishStep(t('publish.progress.translating'));
      setPublishProgress(80);
      triggerTranslation(listing.id).catch(() => {});

      setPublishProgress(100);
      setPublishStep(t('publish.progress.done'));

      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      trackEvent('bulk_listing_created', { listing_id: listing.id, session_count: newCount, category: form.category });

      toast({ title: `✅ ${t('bulkCreate.created')} (#${newCount})` });

      setForm(f => ({ ...f, title: '', description: '', price: '' }));
      setExtraFields(prev => {
        const kept: Record<string, string> = {};
        if (prev.rental_period) kept.rental_period = prev.rental_period;
        return kept;
      });
      setPhotos([]);
      setPreviews([]);

      setTimeout(() => titleRef.current?.focus(), 300);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    }

    setLoading(false);
    setPublishProgress(0);
    setPublishStep('');
  };

  if (!user || tier !== 'agence') return null;

  if (profile?.user_type === 'business' && !profile?.is_verified_seller) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-lg text-muted-foreground">{t('security.npwpRequiredToSell')}</p>
        <Button className="mt-4" onClick={() => navigate('/profile#npwp')}>{t('security.npwpGoVerify')}</Button>
      </div>
    );
  }

  if (!profile?.phone_verified) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">{t('createListing.whatsappRequired')}</p>
        <Button className="mt-4" onClick={() => navigate('/profile')}>{t('createListing.verifyWhatsapp')}</Button>
      </div>
    );
  }

  const currentExtraFields = SUBCATEGORY_FIELDS[form.subcategory] || CATEGORY_FIELDS[form.category];

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            {t('bulkCreate.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('bulkCreate.subtitle')}</p>
        </div>
        {sessionCount > 0 && (
          <Badge variant="secondary" className="text-base px-3 py-1.5 gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {sessionCount} {t('bulkCreate.published')}
          </Badge>
        )}
      </div>

      {loading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>{publishStep}</span>
            <span>{publishProgress}%</span>
          </div>
          <Progress value={publishProgress} className="h-2" />
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('createListing.stepCategory')} *</Label>
            <Select value={form.category} onValueChange={v => {
              setForm(f => ({ ...f, category: v, subcategory: '', listing_type: 'sale' }));
              setExtraFields({});
            }}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('createListing.selectSubcategory')} *</Label>
            <Select value={form.subcategory} onValueChange={v => {
              const autoType = (SUBCATEGORIES_FORCE_RENT as readonly string[]).includes(v) ? 'rent'
                : (SUBCATEGORIES_FORCE_SALE as readonly string[]).includes(v) ? 'sale'
                : form.listing_type;
              setForm(f => ({ ...f, subcategory: v, listing_type: autoType }));
            }} disabled={!form.category}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {form.category && CATEGORY_TREE[form.category]?.map(sub => (
                  <SelectItem key={sub} value={sub}>{t(`subcategories.${sub}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>{t('createListing.titleLabel')} *</Label>
          <Input
            ref={titleRef}
            placeholder={t('createListing.titlePlaceholder')}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={titleBad ? 'border-destructive' : ''}
          />
          {titleBad && <p className="text-xs text-destructive mt-1">{t('security.noPhoneOrLinks')}</p>}
        </div>
        <div>
          <Label>{t('createListing.descriptionLabel')} *</Label>
          <Textarea
            placeholder={t('createListing.descriptionPlaceholder')}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className={descBad ? 'border-destructive' : ''}
          />
          {descBad && <p className="text-xs text-destructive mt-1">{t('security.noPhoneOrLinks')}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!(form.category === 'emploi' && extraFields.salary_negotiable === 'true') && (
            <div>
              <Label>
                {form.category === 'emploi' ? t('createListing.salaryLabel')
                  : form.listing_type === 'rent' ? t('createListing.rentPriceLabel')
                  : t('createListing.priceLabel')} *
              </Label>
              <Input
                type="number" min="0"
                placeholder={form.category === 'emploi' ? t('createListing.salaryPlaceholder') : t('createListing.pricePlaceholder')}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
          )}

          <div>
            <Label>{t('createListing.locationLabel')} *</Label>
            <div className="flex gap-1">
              <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={t('createListing.selectLocation')} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOCATION_GROUPS).map(([island, locs]) => (
                    <SelectGroup key={island}>
                      <SelectLabel className="font-bold text-primary">{t(`islands.${island}`)}</SelectLabel>
                      {locs.map(l => (
                        <SelectItem key={l} value={l}>{t(`locations.${l}`)}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" disabled={locating} onClick={async () => {
                setLocating(true);
                try {
                  const { getCurrentPosition } = await import('@/lib/geolocation');
                  const { latitude, longitude } = await getCurrentPosition();
                  let closest = 'other'; let minDist = Infinity;
                  for (const [loc, coords] of Object.entries(LOCATION_COORDS)) {
                    if (loc === 'other') continue;
                    const d = getDistanceKm(latitude, longitude, coords.lat, coords.lng);
                    if (d < minDist) { minDist = d; closest = loc; }
                  }
                  setForm(f => ({ ...f, location: closest }));
                  toast({ title: t(`locations.${closest}`) });
                } catch { toast({ title: t('common.error'), variant: 'destructive' }); }
                setLocating(false);
              }}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {!CATEGORIES_WITHOUT_CONDITION.includes(form.category as any) && (
            <div>
              <Label>{t('createListing.conditionLabel')}</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c}>{t(`conditions.${c}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {(CATEGORIES_WITH_RENTAL as readonly string[]).includes(form.category) &&
         !(SUBCATEGORIES_FORCE_RENT as readonly string[]).includes(form.subcategory) &&
         !(SUBCATEGORIES_FORCE_SALE as readonly string[]).includes(form.subcategory) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('createListing.listingTypeLabel')}</Label>
              <Select value={form.listing_type} onValueChange={v => setForm(f => ({ ...f, listing_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">{t('listingType.sale')}</SelectItem>
                  <SelectItem value="rent">{t('listingType.rent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.listing_type === 'rent' && (
              <div>
                <Label>{t('createListing.rentalPeriodLabel')}</Label>
                <Select value={extraFields.rental_period || 'monthly'} onValueChange={v => setExtraFields(prev => ({ ...prev, rental_period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('rentalPeriod.daily')}</SelectItem>
                    <SelectItem value="monthly">{t('rentalPeriod.monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('rentalPeriod.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {form.category === 'emploi' && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="salary_negotiable"
              checked={extraFields.salary_negotiable === 'true'}
              onChange={e => {
                setExtraFields(prev => ({ ...prev, salary_negotiable: e.target.checked ? 'true' : 'false' }));
                if (e.target.checked) setForm(f => ({ ...f, price: '0' }));
              }}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="salary_negotiable" className="cursor-pointer">{t('createListing.salaryNegotiable')}</Label>
          </div>
        )}

        {currentExtraFields && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('extraFields.categorySpecificInfo')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {currentExtraFields.map(field => (
                <div key={field.key} className={field.type === 'text' && !field.suffix ? 'col-span-2 sm:col-span-1' : ''}>
                  <Label>{t(field.labelKey)} {field.required ? '*' : ''}</Label>
                  {field.type === 'select' && field.options ? (
                    <>
                      <Select value={extraFields[field.key] || ''} onValueChange={v => {
                        setExtraFields(prev => ({ ...prev, [field.key]: v }));
                        if (v !== 'autre') setExtraFields(prev => { const c = { ...prev }; delete c[field.key + '_custom']; return c; });
                      }}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {field.options.map(opt => (
                            <SelectItem key={opt} value={opt}>
                              {field.rawOptions ? (opt === 'autre' ? t('extraFields.autre') : opt) : t(`extraFields.${opt}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {extraFields[field.key] === 'autre' && (
                        <Input className="mt-2" placeholder={t('extraFields.specifyOther')}
                          value={extraFields[field.key + '_custom'] || ''}
                          onChange={e => setExtraFields(prev => ({ ...prev, [field.key + '_custom']: e.target.value }))}
                        />
                      )}
                    </>
                  ) : (
                    <div className="relative">
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder || ''}
                        value={extraFields[field.key] || ''}
                        onChange={e => setExtraFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                      {field.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.suffix}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>{t('createListing.stepPhotos')} * ({photos.length}/{proMaxPhotos})</Label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < proMaxPhotos && (
              isNativePlatform ? (
                <button type="button" onClick={handleNativePhoto}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">{t('createListing.addPhoto')}</span>
                </button>
              ) : (
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">{t('createListing.addPhoto')}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={!canSubmit()} className="flex-1 h-12 text-base gap-2" size="lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {t('bulkCreate.publishAndNext')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/my-listings')}>
            {t('bulkCreate.done')}
          </Button>
        </div>

        {sessionCount > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('bulkCreate.keepGoing')}
          </p>
        )}
      </div>
    </div>
  );
}
