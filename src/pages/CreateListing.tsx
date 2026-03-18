import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getListingImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CATEGORIES, CATEGORY_TREE, LOCATIONS, LOCATION_GROUPS, CONDITIONS, CATEGORY_ICONS, MAX_ACTIVE_LISTINGS, formatPrice, CATEGORY_FIELDS, SUBCATEGORY_FIELDS, CATEGORIES_WITHOUT_CONDITION, CATEGORIES_WITH_RENTAL, SUBCATEGORIES_FORCE_RENT, SUBCATEGORIES_FORCE_SALE, getRentalPeriodSuffix } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { Upload, X, ChevronLeft, ChevronRight, Check, MapPin, Loader2, AlertTriangle, ShieldCheck, Rocket, Star, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LOCATION_COORDS, getDistanceKm } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { useProStatus } from '@/hooks/useProStatus';


const STEPS = ['stepCategory', 'stepDetails', 'stepPhotos', 'stepPreview'] as const;

export default function CreateListing() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPreBoost, setShowPreBoost] = useState(false);
  const [boostChoice, setBoostChoice] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStep, setPublishStep] = useState('');
  const [existingImageUrls, setExistingImageUrls] = useState<{ id: string; storage_path: string; url: string }[]>([]);

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
  const [moderationWarnings, setModerationWarnings] = useState<string[]>([]);
  const subcategoryRef = useRef<HTMLDivElement>(null);

  // Compute SHA-256 hash of a file for duplicate detection
  const computeImageHash = async (file: File | Blob): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const { data: activeCount } = useQuery({
    queryKey: ['active-listing-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.rpc('get_active_listing_count', { _user_id: user.id });
      return data || 0;
    },
    enabled: !!user,
  });

  // Dynamic listing limit based on user type and subscription
  const { listingLimit: proListingLimit, isPro } = useProStatus();
  const effectiveLimit = isPro ? proListingLimit : MAX_ACTIVE_LISTINGS;
  const canPost = isEditMode || (activeCount || 0) < effectiveLimit;

  // Load existing listing for edit mode
  useEffect(() => {
    if (!editId || !user) return;
    const loadListing = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(id, storage_path, sort_order)')
        .eq('id', editId)
        .eq('seller_id', user.id)
        .single();
      if (!data) { navigate('/my-listings'); return; }
      setIsEditMode(true);
      setForm({
        category: data.category,
        subcategory: data.subcategory || '',
        title: data.title_original,
        description: data.description_original,
        price: String(data.price),
        currency: data.currency,
        location: data.location_area,
        condition: data.condition,
        listing_type: (data as any).listing_type || 'sale',
      });
      if (data.extra_fields && typeof data.extra_fields === 'object') {
        setExtraFields(data.extra_fields as Record<string, string>);
      }
      const imgs = (data.listing_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      setExistingImageUrls(imgs.map((img: any) => ({
        id: img.id,
        storage_path: img.storage_path,
        url: getListingImageUrl(img.storage_path),
      })));
    };
    loadListing();
  }, [editId, user]);

  // Photo limit based on account type (Free Pro = 3, others = 10)
  const proMaxPhotos = profile?.user_type === 'business' ? (() => {
    // Will be refined by useProStatus in the future, for now use simple check
    return 3; // Default for Free Pro, will be overridden by subscription
  })() : 10;

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
  }, [photos]);

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const canProceed = () => {
    if (step === 0) return !!form.category && !!form.subcategory;
    if (step === 1) {
      const isNegotiable = form.category === 'emploi' && extraFields.salary_negotiable === 'true';
      return form.title && form.description && (isNegotiable || form.price !== '') && form.location;
    }
    if (step === 2) return photos.length > 0 || existingImageUrls.length > 0;
    return true;
  };

  // Content filtering patterns
  const SUSPICIOUS_PATTERNS = [
    /wa\.me\//i, /t\.me\//i, /bit\.ly\//i, /tinyurl\.com/i,
    /https?:\/\/[^\s]+/i, /telegram/i, /whatsapp\.com/i, /signal\.me/i,
  ];

  // Phone detection: match phone-like patterns but exclude Indonesian prices (e.g. 28.000.000)
  const PHONE_PATTERN = /(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,5}/;
  const INDONESIAN_PRICE_PATTERN = /\b\d{1,3}(\.\d{3}){1,4}\b/;

  const looksLikePhone = (text: string): boolean => {
    // Remove Indonesian-format prices before checking for phone numbers
    const cleaned = text.replace(INDONESIAN_PRICE_PATTERN, '');
    return PHONE_PATTERN.test(cleaned);
  };

  const checkContent = (text: string): boolean => {
    return SUSPICIOUS_PATTERNS.some(p => p.test(text)) || looksLikePhone(text);
  };

  // Watermark function — diagonal repeating pattern for uniform coverage
  const addWatermark = async (file: File | Blob, username: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const shortSide = Math.min(w, h);
        const fontSize = Math.max(12, Math.round(shortSide / 50));
        const text = `Re-Bali.com`;

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

        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/jpeg', 0.9);
      };
      if (file instanceof File || file instanceof Blob) {
        img.src = URL.createObjectURL(file);
      }
    });
  };

  // Re-watermark an image from a URL
  const rewatermarkFromUrl = async (url: string, username: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const result = await addWatermark(blob, username);
            resolve(result);
          } else {
            resolve(new Blob());
          }
        }, 'image/jpeg', 0.9);
      };
      img.src = url;
    });
  };

  const triggerListingTranslation = async (listingId: string) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { error } = await supabase.functions.invoke('translate-listing', {
        body: { listing_id: listingId },
      });

      if (!error) return;
      if (attempt === 2) {
        console.error('translate-listing invoke failed:', error);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result as T | null;
  };

  // Called when user clicks "Publish" — for new listings, show boost choice first
  const handlePublishClick = () => {
    if (!user || !canPost || loading) return;
    if (checkContent(form.description) || checkContent(form.title)) {
      toast({ title: t('security.contentBlocked'), variant: 'destructive' });
      return;
    }
    if (isEditMode) {
      // Edit mode: no boost prompt, just publish directly
      handlePublish(null);
    } else {
      setShowPreBoost(true);
    }
  };

  const handleBoostDecision = (choice: string | null) => {
    setShowPreBoost(false);
    setBoostChoice(choice);
    handlePublish(choice);
  };

  const handlePublish = async (selectedBoost: string | null) => {
    if (!user || !canPost || loading) return;

    setLoading(true);
    setPublishProgress(5);
    setPublishStep(t('publish.progress.preparing'));

    // Run image moderation checks (hash duplicate detection)
    setModerationWarnings([]);
    if (photos.length > 0) {
      try {
        setPublishStep(t('publish.progress.checking'));
        setPublishProgress(10);
        const firstHash = await computeImageHash(photos[0]);
        const moderationResponse = await withTimeout(
          supabase.functions.invoke('moderate-image', {
            body: {
              image_hash: firstHash,
              title: form.title,
              description: form.description,
            },
          }),
          15000
        );

        if (!moderationResponse) {
          console.warn('moderate-image timed out, continuing publication');
        } else {
          const { data: modResult, error: moderationError } = moderationResponse;
          if (moderationError) {
            console.warn('Moderation check failed, continuing publication', moderationError);
          } else if (modResult && !modResult.safe) {
            const warnings = (modResult.warnings || []) as string[];
            setModerationWarnings(warnings);
            if (warnings.includes('duplicate_image')) {
              const dupeTitle = modResult.duplicate_listings?.[0]?.title || '';
              toast({
                title: t('moderation.duplicateImage'),
                description: dupeTitle ? `${t('moderation.duplicateOf')}: "${dupeTitle}"` : undefined,
                variant: 'destructive',
              });
              setLoading(false);
              setPublishProgress(0);
              return;
            }
            if (warnings.includes('similar_title')) {
              toast({ title: t('moderation.similarTitle'), variant: 'destructive' });
            }
          }
        }
      } catch (e) {
        console.warn('Moderation check failed, proceeding anyway', e);
      }
    }

    try {
      if (isEditMode && editId) {
        setPublishStep(t('publish.progress.updating'));
        setPublishProgress(20);
        // Update existing listing
        const { error } = await supabase.from('listings').update({
          category: form.category as any,
          subcategory: form.subcategory,
          title_original: form.title,
          description_original: form.description,
          price: parseFloat(form.price) || 0,
          currency: form.currency,
          location_area: form.location,
          condition: form.condition as any,
          extra_fields: extraFields,
          listing_type: form.listing_type,
        } as any).eq('id', editId);
        if (error) throw error;

        const username = profile?.display_name || 'user';
        const startIndex = existingImageUrls.length;

        setPublishStep(t('publish.progress.uploading'));
        for (let i = 0; i < photos.length; i++) {
          setPublishProgress(20 + Math.round((i / Math.max(photos.length, 1)) * 50));
          const imageHash = await computeImageHash(photos[i]);
          const watermarked = await addWatermark(photos[i], username);
          const originalBlob = await new Promise<Blob>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', 0.9);
              };
              img.src = reader.result as string;
            };
            reader.readAsDataURL(photos[i]);
          });
          const path = `${user.id}/${editId}/${startIndex + i}.jpg`;
          const wmPath = `${user.id}/${editId}/${startIndex + i}_wm.jpg`;
          await supabase.storage.from('listings').upload(path, originalBlob);
          await supabase.storage.from('listings').upload(wmPath, watermarked);
          await supabase.from('listing_images').insert({
            listing_id: editId,
            storage_path: path,
            sort_order: startIndex + i,
            image_hash: imageHash,
          } as any);
        }

        setPublishStep(t('publish.progress.translating'));
        setPublishProgress(80);
        await triggerListingTranslation(editId);

        setPublishProgress(100);
        setPublishStep(t('publish.progress.done'));
        toast({ title: t('listing.updated') });
        await new Promise(r => setTimeout(r, 500));
        navigate(`/listing/${editId}`);
      } else {
        // Create new listing
        setPublishStep(t('publish.progress.creating'));
        setPublishProgress(15);
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

        // Upload images
        setPublishStep(t('publish.progress.uploading'));
        const username = profile?.display_name || 'user';
        for (let i = 0; i < photos.length; i++) {
          setPublishProgress(20 + Math.round((i / Math.max(photos.length, 1)) * 45));
          const imageHash = await computeImageHash(photos[i]);
          const watermarked = await addWatermark(photos[i], username);
          const originalBlob = await new Promise<Blob>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', 0.9);
              };
              img.src = reader.result as string;
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

        // Apply boost if chosen
        if (selectedBoost) {
          setPublishStep(t('publish.progress.boosting'));
          setPublishProgress(70);

          const boostResponse = await withTimeout(
            selectedBoost === 'stock'
              ? supabase.functions.invoke('manage-points', {
                  body: { action: 'use_stock_boost', listing_id: listing.id },
                })
              : supabase.functions.invoke('manage-points', {
                  body: { action: 'purchase', addon_type: selectedBoost, listing_id: listing.id },
                }),
            15000
          );

          if (!boostResponse) {
            toast({ title: t('points.purchaseError'), variant: 'destructive' });
          } else if (boostResponse.error || boostResponse.data?.error) {
            const boostError = boostResponse.data?.error;
            const boostErrorMessage = boostError === 'insufficient_points'
              ? t('points.insufficientPoints')
              : boostError === 'already_boosted'
              ? t('points.boost.alreadyBoosted')
              : boostError === 'no_stock_boosts'
              ? t('points.boost.noStockBoosts')
              : t('points.purchaseError');
            toast({ title: boostErrorMessage, variant: 'destructive' });
          }
        }

        // Trigger translation (fire-and-forget for speed)
        setPublishStep(t('publish.progress.translating'));
        setPublishProgress(85);
        triggerListingTranslation(listing.id).catch(() => {});

        // Small delay to let translation start
        await new Promise(r => setTimeout(r, 600));

        setPublishProgress(100);
        setPublishStep(t('publish.progress.done'));
        toast({ title: t('createListing.listingCreated') });
        import('@/lib/analytics').then(({ trackEvent }) => trackEvent('listing_created', { listing_id: listing.id, category: form.category })).catch(() => {});
        await new Promise(r => setTimeout(r, 500));
        navigate(`/listing/${listing.id}`);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
    setPublishProgress(0);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Pro users must have NPWP verified (is_verified_seller) before selling
  if (profile?.user_type === 'business' && !profile?.is_verified_seller) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-lg text-muted-foreground">{t('security.npwpRequiredToSell')}</p>
        <Button className="mt-4" onClick={() => navigate('/profile')}>{t('security.npwpGoVerify')}</Button>
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

  if (!canPost) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">{t('createListing.limitReached')}</p>
        <p className="text-sm text-muted-foreground mt-2">{activeCount}/{effectiveLimit === 9999 ? '∞' : effectiveLimit} {t('myListings.activeCount')}</p>
        <Button className="mt-4" onClick={() => navigate('/my-listings')}>{t('nav.myListings')}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">{isEditMode ? t('listing.editListing') : t('createListing.title')}</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-sm hidden sm:inline">{t(`createListing.${s}`)}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Category */}
      {step === 0 && (
        <div className="space-y-6">
          {/* Main categories */}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <Card key={cat}
                className={`cursor-pointer transition-all hover:shadow-md ${form.category === cat ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setForm(f => ({ ...f, category: cat, subcategory: '', listing_type: 'sale' }));
                  setTimeout(() => subcategoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}>
                <CardContent className="p-4 text-center">
                  <span className="text-3xl block mb-2">{CATEGORY_ICONS[cat]}</span>
                  <span className="font-medium text-sm">{t(`categories.${cat}`)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Subcategories */}
          {form.category && CATEGORY_TREE[form.category] && (
            <div ref={subcategoryRef}>
              <Label className="mb-2 block">{t('createListing.selectSubcategory')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_TREE[form.category].map(sub => (
                  <Card key={sub}
                    className={`cursor-pointer transition-all hover:shadow-md ${form.subcategory === sub ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      const autoType = (SUBCATEGORIES_FORCE_RENT as readonly string[]).includes(sub) ? 'rent'
                        : (SUBCATEGORIES_FORCE_SALE as readonly string[]).includes(sub) ? 'sale'
                        : form.listing_type;
                      setForm(f => ({ ...f, subcategory: sub, listing_type: autoType }));
                    }}>
                    <CardContent className="p-3 text-center">
                      <span className="font-medium text-sm">{t(`subcategories.${sub}`)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>{t('createListing.titleLabel')} *</Label>
            <Input placeholder={t('createListing.titlePlaceholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>{t('createListing.descriptionLabel')} *</Label>
            <Textarea placeholder={t('createListing.descriptionPlaceholder')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} />
          </div>
          {form.category === 'emploi' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="salary_negotiable"
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
          {!(form.category === 'emploi' && extraFields.salary_negotiable === 'true') && (
            <div>
              <Label>
                {form.category === 'emploi' ? t('createListing.salaryLabel')
                  : form.listing_type === 'rent' ? t('createListing.rentPriceLabel')
                  : t('createListing.priceLabel')} * <span className="text-muted-foreground font-normal text-xs">IDR{form.listing_type === 'rent' ? ' ' + getRentalPeriodSuffix(extraFields.rental_period, t) : ''}</span>
              </Label>
              <Input type="number" min="0" placeholder={form.category === 'emploi' ? t('createListing.salaryPlaceholder') : t('createListing.pricePlaceholder')} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          )}
          {/* Listing type selector (sale/rent) */}
          {(CATEGORIES_WITH_RENTAL as readonly string[]).includes(form.category) && 
           !(SUBCATEGORIES_FORCE_RENT as readonly string[]).includes(form.subcategory) && 
           !(SUBCATEGORIES_FORCE_SALE as readonly string[]).includes(form.subcategory) && (
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
          )}
          {/* Rental period selector */}
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
          <div>
            <Label>{t('createListing.locationLabel')} *</Label>
            <div className="flex gap-2">
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={locating}
                onClick={async () => {
                  setLocating(true);
                  try {
                    const { getCurrentPosition } = await import('@/lib/geolocation');
                    const { latitude, longitude } = await getCurrentPosition();
                    let closest = 'other';
                    let minDist = Infinity;
                    for (const [loc, coords] of Object.entries(LOCATION_COORDS)) {
                      if (loc === 'other') continue;
                      const d = getDistanceKm(latitude, longitude, coords.lat, coords.lng);
                      if (d < minDist) { minDist = d; closest = loc; }
                    }
                    setForm(f => ({ ...f, location: closest }));
                    toast({ title: t(`locations.${closest}`) });
                  } catch {
                    toast({ title: t('common.error'), variant: 'destructive' });
                  }
                  setLocating(false);
                }}
              >
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

          {/* Category-specific extra fields (subcategory overrides category) */}
          {(() => {
            const fields = SUBCATEGORY_FIELDS[form.subcategory] || CATEGORY_FIELDS[form.category];
            if (!fields) return null;
            return (
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('extraFields.categorySpecificInfo')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {fields.map(field => (
                  <div key={field.key} className={field.type === 'text' && !field.suffix ? 'col-span-2 sm:col-span-1' : ''}>
                    <Label>{t(field.labelKey)} {field.required ? '*' : ''}</Label>
                    {field.type === 'select' && field.options ? (
                      <>
                        <Select value={extraFields[field.key] || ''} onValueChange={v => {
                          setExtraFields(prev => ({ ...prev, [field.key]: v }));
                          if (v !== 'autre') setExtraFields(prev => { const copy = { ...prev }; delete copy[field.key + '_custom']; return copy; });
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
                          <Input
                            className="mt-2"
                            placeholder={t('extraFields.specifyOther')}
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
            );
          })()}
        </div>
      )}

      {/* Step 2: Photos */}
      {step === 2 && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {existingImageUrls.map((img, i) => (
              <div key={`existing-${img.id}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button onClick={async () => {
                  await supabase.from('listing_images').delete().eq('id', img.id);
                  await supabase.storage.from('listings').remove([img.storage_path]);
                  setExistingImageUrls(prev => prev.filter((_, idx) => idx !== i));
                }} className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {(photos.length + existingImageUrls.length) < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">{t('createListing.dragOrClick')}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{photos.length + existingImageUrls.length}/10 — {t('createListing.maxPhotos')}</p>
          {moderationWarnings.length > 0 && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {moderationWarnings.includes('duplicate_image') && <p>{t('moderation.duplicateImage')}</p>}
                {moderationWarnings.includes('similar_title') && <p>{t('moderation.similarTitle')}</p>}
                {moderationWarnings.includes('image_reused') && <p>{t('moderation.imageReused')}</p>}
                {moderationWarnings.includes('suspicious_content') && <p>{t('moderation.suspiciousContent')}</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {(existingImageUrls[0] || previews[0]) && <img src={existingImageUrls[0]?.url || previews[0]} alt="" className="w-full aspect-[4/3] object-cover rounded-lg" />}
            <Badge>{CATEGORY_ICONS[form.category]} {t(`categories.${form.category}`)} — {t(`subcategories.${form.subcategory}`)}</Badge>
            <h2 className="text-xl font-bold">{form.title}</h2>
            <p className="text-2xl font-bold text-primary">
              {form.category === 'emploi' && extraFields.salary_negotiable === 'true'
                ? t('createListing.salaryNegotiable')
                : formatPrice(parseFloat(form.price) || 0, form.currency)}
            </p>
            <p className="text-sm text-muted-foreground">{t(`locations.${form.location}`)} · {t(`conditions.${form.condition}`)}</p>
            <p className="text-muted-foreground">{form.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> {t('common.back')}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handlePublishClick} disabled={loading}>
            {isEditMode ? t('listing.update') : t('createListing.publishListing')}
          </Button>
        )}
      </div>

      {/* Pre-publish boost choice dialog */}
      <PreBoostDialog
        open={showPreBoost}
        onClose={() => setShowPreBoost(false)}
        onChoice={handleBoostDecision}
        t={t}
      />

      {/* Publishing overlay */}
      {loading && publishProgress > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-primary animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('publish.progress.title')}</h3>
              <p className="text-sm text-muted-foreground">{publishStep}</p>
            </div>
            <Progress value={publishProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">{publishProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Pre-publish boost choice ---- */
function PreBoostDialog({ open, onClose, onChoice, t }: {
  open: boolean;
  onClose: () => void;
  onChoice: (choice: string | null) => void;
  t: (key: string) => string;
}) {
  const { user } = useAuth();
  const [pendingChoice, setPendingChoice] = useState<'stock' | 'boost' | 'boost_premium' | null>(null);
  const [buyingPoints, setBuyingPoints] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPendingChoice(null);
    setBuyingPoints(false);
    setAwaitingPayment(false);
  }, [open]);

  const { data: stockBoosts = [], refetch: refetchStockBoosts } = useQuery({
    queryKey: ['stock-boosts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_addons')
        .select('id, listing_id, addon_type, expires_at')
        .eq('user_id', user.id)
        .eq('active', true)
        .eq('addon_type', 'boost')
        .is('listing_id', null);
      return (data || []).filter((boost) => boost.expires_at && new Date(boost.expires_at).getTime() > Date.now());
    },
    enabled: !!user && open,
  });

  const { data: pointsData, refetch: refetchPoints } = useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const refreshBoostData = useCallback(async () => {
    await Promise.all([refetchPoints(), refetchStockBoosts()]);
  }, [refetchPoints, refetchStockBoosts]);

  const balance = pointsData?.balance ?? 0;
  const stockCount = stockBoosts.length;
  const requiredPoints = pendingChoice === 'boost_premium' ? 100 : pendingChoice === 'boost' ? 50 : 0;
  const needsPoints = pendingChoice === 'boost' || pendingChoice === 'boost_premium';
  const hasEnoughPoints = !needsPoints || balance >= requiredPoints;
  const canConfirm = !!pendingChoice && (pendingChoice === 'stock' ? stockCount > 0 : hasEnoughPoints);

  useEffect(() => {
    if (!open || !awaitingPayment) return;
    const onFocus = () => {
      void refreshBoostData();
    };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      void refreshBoostData();
    }, 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [open, awaitingPayment, refreshBoostData]);

  useEffect(() => {
    if (!awaitingPayment || !needsPoints) return;
    if (balance >= requiredPoints) {
      setAwaitingPayment(false);
      toast({ title: t('points.purchaseSuccess') });
    }
  }, [awaitingPayment, needsPoints, balance, requiredPoints, t]);

  const handleBuyPoints = async () => {
    if (!needsPoints || hasEnoughPoints) return;

    const missingPoints = requiredPoints - balance;
    const packId = missingPoints <= 50
      ? 'starter'
      : missingPoints <= 150
      ? 'popular'
      : missingPoints <= 300
      ? 'pro'
      : 'business';

    setBuyingPoints(true);
    const { data, error } = await supabase.functions.invoke('xendit-create-invoice', {
      body: { type: 'points', pack_id: packId },
    });

    if (error || data?.error || !data?.invoice_url) {
      toast({ title: t('points.purchaseError'), variant: 'destructive' });
      setBuyingPoints(false);
      return;
    }

    const paymentWindow = window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    if (!paymentWindow) {
      window.location.href = data.invoice_url;
    } else {
      setAwaitingPayment(true);
      void refreshBoostData();
    }

    setBuyingPoints(false);
  };

  const handleConfirm = () => {
    if (!pendingChoice) return;

    if (pendingChoice === 'stock' && stockCount === 0) {
      toast({ title: t('points.boost.noStockBoosts'), variant: 'destructive' });
      return;
    }

    if (needsPoints && !hasEnoughPoints) {
      toast({ title: t('points.insufficientPoints'), variant: 'destructive' });
      return;
    }

    onChoice(pendingChoice);
  };

  const getCardClass = (option: 'stock' | 'boost' | 'boost_premium') => {
    const isSelected = pendingChoice === option;
    return `w-full rounded-xl border p-4 transition-colors text-left flex items-center gap-3 ${
      isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
    }`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-sm border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">🔥 {t('points.boost.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('points.boost.dialogChoose')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {stockCount > 0 && (
            <button type="button" onClick={() => setPendingChoice('stock')} className={getCardClass('stock')}>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t('points.boost.useStock')}</p>
                <p className="text-xs text-muted-foreground">{t('points.boost.useStockDesc').replace('{count}', String(stockCount))}</p>
              </div>
              <Badge variant="secondary">{t('points.boost.free')}</Badge>
            </button>
          )}

          <button type="button" onClick={() => setPendingChoice('boost')} className={getCardClass('boost')}>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('points.boost.boost48h')}</p>
              <p className="text-xs text-muted-foreground">{t('points.boost.boost48hDesc')}</p>
            </div>
            <span className="font-bold text-primary text-sm">50 pts</span>
          </button>

          <button type="button" onClick={() => setPendingChoice('boost_premium')} className={getCardClass('boost_premium')}>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('points.boost.premium')}</p>
              <p className="text-xs text-muted-foreground">{t('points.boost.premiumDesc')}</p>
            </div>
            <span className="font-bold text-primary text-sm">100 pts</span>
          </button>

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground text-center">
            💰 {balance} pts
          </div>

          {pendingChoice && (
            <p className="text-xs text-center text-muted-foreground">{t('points.boost.confirmQuestion')}</p>
          )}

          {pendingChoice && needsPoints && !hasEnoughPoints && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs text-destructive">
                {t('points.insufficientPoints')} ({balance}/{requiredPoints} pts)
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={handleBuyPoints} disabled={buyingPoints}>
                {buyingPoints ? <Loader2 className="h-4 w-4 animate-spin" /> : t('points.buy')}
              </Button>
              {awaitingPayment && (
                <p className="text-[11px] text-muted-foreground text-center">{t('points.purchaseSuccess')}</p>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => onChoice(null)}>
              {t('common.skip') || 'Skip'}
            </Button>
            <Button type="button" className="w-full" disabled={!canConfirm} onClick={handleConfirm}>
              {t('points.boost.confirm')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
