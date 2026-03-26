import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ListingCard from '@/components/ListingCard';
import ProBadge from '@/components/ProBadge';
import TrustIndicator from '@/components/TrustIndicator';
import UserBadges from '@/components/UserBadges';
import { toast } from '@/hooks/use-toast';
import { Building2, Calendar, Package, Star, User, Pencil, Upload } from 'lucide-react';

export default function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === id;
  const [editOpen, setEditOpen] = useState(false);

  const { data: seller } = useQuery({
    queryKey: ['seller', id],
    queryFn: async () => {
      const { data } = await supabase.from('public_profiles').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: businessPage } = useQuery({
    queryKey: ['business-page', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_pages')
        .select('*')
        .eq('user_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['seller-listings', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('seller_id', id!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['seller-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: trustData } = useQuery({
    queryKey: ['seller-trust', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('trust_scores')
        .select('score, risk_level')
        .eq('user_id', id!)
        .order('last_calculated', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  if (!seller) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.loading')}</div>;

  const logoUrl = businessPage?.logo_url
    ? supabase.storage.from('avatars').getPublicUrl(businessPage.logo_url).data.publicUrl
    : seller.avatar_url;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Business Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
        <CardContent className="p-6 -mt-12">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-20 h-20 rounded-xl bg-background border-4 border-background shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {businessPage?.business_name || seller.display_name || 'Business'}
                </h1>
                <ProBadge tier="agence" />
              </div>
              {businessPage?.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                  {businessPage.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('profile.memberSince')} {new Date(seller.created_at!).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {listings.length} {t('seller.activeListings')}
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    {avgRating.toFixed(1)} ({reviews.length})
                  </span>
                )}
              </div>
            </div>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1">
                <Pencil className="h-3 w-3" /> {t('common.edit')}
              </Button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t space-y-3">
            <UserBadges userId={id!} profile={seller} />
            <TrustIndicator score={trustData?.score ?? 50} riskLevel={(trustData?.risk_level as 'low' | 'medium' | 'high') ?? 'low'} />
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">{t('business.portfolio')} ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">{t('common.noResults')}</p>
        )}
      </div>

      {/* Edit Dialog (owner only) */}
      {isOwner && (
        <BusinessPageEditor
          open={editOpen}
          onOpenChange={setEditOpen}
          businessPage={businessPage}
          userId={user.id}
          t={t}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function BusinessPageEditor({ open, onOpenChange, businessPage, userId, t, queryClient }: any) {
  const [name, setName] = useState(businessPage?.business_name || '');
  const [desc, setDesc] = useState(businessPage?.description || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `business-logos/${userId}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;

      // Upsert business page with logo
      await upsertPage({ logo_url: path });
      toast({ title: t('common.save') });
    } catch {
      toast({ title: 'Upload error', variant: 'destructive' });
    }
    setUploading(false);
  };

  const upsertPage = async (extra: any = {}) => {
    const payload = {
      user_id: userId,
      business_name: name || null,
      description: desc || null,
      ...extra,
    };

    if (businessPage?.id) {
      await supabase.from('business_pages').update(payload).eq('id', businessPage.id);
    } else {
      await supabase.from('business_pages').insert(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['business-page', userId] });
  };

  const handleSave = async () => {
    setSaving(true);
    await upsertPage();
    toast({ title: t('common.save') });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('business.editPage')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('business.logo')}</label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" />
                {uploading ? t('common.loading') : t('business.uploadLogo')}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('business.name')}</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('business.namePlaceholder')} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('business.description')}</label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('business.descPlaceholder')} rows={4} className="mt-1" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? '...' : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
