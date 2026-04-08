import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SellerProfileSkeleton from '@/components/skeletons/SellerProfileSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ListingCard from '@/components/ListingCard';
import { User, Briefcase, Star, Calendar, Package, ShieldCheck, CheckCircle, Languages } from 'lucide-react';
import UserBadges from '@/components/UserBadges';
import TrustIndicator from '@/components/TrustIndicator';
import ActiveSellerStatus from '@/components/ActiveSellerStatus';
import BlockUserButton from '@/components/BlockUserButton';
import ShareButton from '@/components/ShareButton';

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const { data: seller } = useQuery({
    queryKey: ['seller', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Check if this seller has an agence subscription (redirect to business page)
  const { data: hasAgenceSub } = useQuery({
    queryKey: ['seller-agence-check', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pro_subscriptions')
        .select('id')
        .eq('user_id', id!)
        .eq('plan_type', 'agence')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1);
      return (data?.length || 0) > 0;
    },
    enabled: !!id && seller?.user_type === 'business',
  });

  const { data: listings } = useQuery({
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

  const { data: reviews } = useQuery({
    queryKey: ['seller-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles!reviewer_id(display_name, avatar_url)')
        .eq('seller_id', id!)
        .order('created_at', { ascending: false });
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

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  const isPro = seller?.user_type === 'business';

  // Translate review comments into viewer's language
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!reviews || reviews.length === 0 || !language) return;
    const commentsToTranslate = reviews
      .filter((r: any) => r.comment && r.comment.trim().length > 0)
      .map((r: any) => ({ id: r.id, comment: r.comment }));
    if (commentsToTranslate.length === 0) return;

    let cancelled = false;
    setIsTranslating(true);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch(
          `https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/translate-text`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZHJzaHlxbHJweGd2eXhwamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODI0MjYsImV4cCI6MjA4NzA1ODQyNn0.On_i0UMaMbhYVV18NTrWZiUDz6mPqVY8Hrv5URj11tc'}`,
            },
            body: JSON.stringify({
              texts: commentsToTranslate.map((c) => c.comment),
              target_lang: language,
            }),
          }
        );
        if (!res.ok) throw new Error('translate failed');
        const { translated } = await res.json();
        if (cancelled) return;
        const map: Record<string, string> = {};
        commentsToTranslate.forEach((c, i) => {
          if (translated[i] && translated[i] !== c.comment) {
            map[c.id] = translated[i];
          }
        });
        setTranslatedComments(map);
      } catch {
        // keep original comments
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reviews, language]);

  // Redirect agence sellers to their business page
  if (hasAgenceSub) {
    return <Navigate to={`/business/${id}`} replace />;
  }

  if (!seller) return <SellerProfileSkeleton />;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Seller info header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{seller.display_name || 'User'}</h1>
                {isPro && (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Briefcase className="h-3 w-3" />
                    Pro
                  </Badge>
                )}
                {seller.is_verified_seller && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t('security.verifiedSeller')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('profile.memberSince')} {new Date(seller.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {listings?.length || 0} {t('seller.activeListings')}
                </span>
              </div>
              {/* Star rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{avgRating > 0 ? avgRating.toFixed(1) : '-'}/5</span>
                <span className="text-sm text-muted-foreground">({reviews?.length || 0} {t('seller.reviews')})</span>
              </div>
            </div>

            {/* Badges & Trust */}
            <div className="mt-3 space-y-3 border-t pt-3 w-full">
              <div className="flex items-center justify-between">
                <ActiveSellerStatus userId={id!} showStock={false} />
                <ShareButton
                  url={`/seller/${id}`}
                  title={seller.display_name || 'Seller'}
                  variant="button"
                />
              </div>
              <UserBadges userId={id!} profile={seller} />
              <TrustIndicator score={trustData?.score ?? 50} riskLevel={(trustData?.risk_level as 'low' | 'medium' | 'high') ?? 'low'} />
              <BlockUserButton
                targetUserId={id!}
                targetDisplayName={seller.display_name || undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews section - read only */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">{t('seller.reviewsTitle')} ({reviews?.length || 0})</h2>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{review.profiles?.display_name || 'User'}</span>
                      {review.is_verified_purchase && (
                        <Badge variant="secondary" className="gap-1 text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3" />
                          {t('seller.verifiedPurchase')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {translatedComments[review.id] || review.comment}
                      </p>
                      {translatedComments[review.id] && (
                        <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
                          <Languages className="h-3 w-3" />
                          {t('common.autoTranslated')}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('seller.noReviews')}</p>
        )}
      </div>

      {/* Active listings */}
      <h2 className="text-xl font-bold mb-4">{t('seller.allListings')} ({listings?.length || 0})</h2>
      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-10">{t('common.noResults')}</p>
      )}
    </div>
  );
}
