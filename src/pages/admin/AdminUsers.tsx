import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminProfiles, useAdminListings, useAdminReports, useAdminIdVerifications, useAdminProSubscriptions, useAdminUserPoints, useAdminUserAddons } from '@/hooks/useAdminData';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  Users, Search, Eye, Ban, User, Calendar, Globe, Phone, MessageSquare, Package,
  Pencil, Save, X, Coins, TrendingUp, Clock, ShieldCheck, ShieldAlert
} from 'lucide-react';

export default function AdminUsers() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { logAction } = useAdminLog();
  const { data: profiles } = useAdminProfiles();
  const { data: allListings } = useAdminListings();
  const { data: reports } = useAdminReports();
  const { data: idVerifications, refetch: refetchVerifications } = useAdminIdVerifications();
  const { data: proSubscriptions } = useAdminProSubscriptions();
  const { data: allUserPoints } = useAdminUserPoints();
  const { data: allUserAddons } = useAdminUserAddons();

  const [userSearch, setUserSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit fields
  const [editUserDisplayName, setEditUserDisplayName] = useState('');
  const [editUserLang, setEditUserLang] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserWhatsapp, setEditUserWhatsapp] = useState('');
  const [editUserPoints, setEditUserPoints] = useState('');
  const [editUserListingLimit, setEditUserListingLimit] = useState('');
  const [editSubPlanType, setEditSubPlanType] = useState('');
  const [editSubStatus, setEditSubStatus] = useState('');
  const [editSubDurationMonths, setEditSubDurationMonths] = useState('1');

  const filteredProfiles = profiles?.filter((p: any) => {
    const matchesSearch = !userSearch || p.display_name?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesType = userTypeFilter === 'all' || p.user_type === userTypeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const getUserListings = (userId: string) => allListings?.filter((l: any) => l.seller_id === userId) || [];
  const getActiveListingCount = (userId: string) => allListings?.filter((l: any) => l.seller_id === userId && l.status === 'active').length || 0;
  const getUserReports = (userId: string) => reports?.filter((r: any) => r.listings?.seller_id === userId) || [];

  const getMaxListings = (userId: string) => {
    const profile = profiles?.find((p: any) => p.id === userId);
    if (!profile) return 5;

    const extraSlots = (allUserAddons || [])
      .filter((a: any) => a.user_id === userId && a.active)
      .reduce((sum: number, a: any) => sum + (a.extra_slots || 0), 0);

    if (profile.listing_limit_override != null) {
      return profile.listing_limit_override + extraSlots;
    }

    if (profile.user_type === 'business') {
      const activeSub = (proSubscriptions || []).find(
        (s: any) => s.user_id === userId && s.status === 'active' && new Date(s.expires_at) > new Date()
      );

      if (activeSub?.plan_type === 'agence') return 9999;
      if (activeSub?.plan_type === 'vendeur_pro') return 20;
      return 5; // free_pro / no active sub
    }

    const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
    const base = ageDays < 7 ? 3 : 5;
    return base + extraSlots;
  };

  const banUser = async (userId: string, ban: boolean) => {
    await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
    await logAction(ban ? 'ban_user' : 'unban_user', 'user', userId);
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    if (selectedUser?.id === userId) setSelectedUser((prev: any) => prev ? { ...prev, is_banned: ban } : null);
    toast({ title: ban ? t('admin.banUser') : t('admin.unbanUser') });
  };

  const bulkBan = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', id);
    }
    await logAction('bulk_ban_users', 'user', undefined, { count: selectedIds.size, ids: Array.from(selectedIds) });
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} utilisateurs bannis` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const startEditUser = () => {
    if (!selectedUser) return;
    setEditUserDisplayName(selectedUser.display_name || '');
    setEditUserLang(selectedUser.preferred_lang || 'en');
    setEditUserPhone(selectedUser.phone || '');
    setEditUserWhatsapp(selectedUser.whatsapp || '');
    const userPts = allUserPoints?.find((p: any) => p.user_id === selectedUser.id);
    setEditUserPoints(String(userPts?.balance || 0));
    setEditUserListingLimit(selectedUser.listing_limit_override != null ? String(selectedUser.listing_limit_override) : '');
    const activeSub = (proSubscriptions || []).find((s: any) => s.user_id === selectedUser.id && s.status === 'active');
    setEditSubPlanType(activeSub?.plan_type || 'vendeur_pro');
    setEditSubStatus(activeSub ? 'active' : 'none');
    setEditSubDurationMonths('1');
    setEditingUser(true);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    const listingLimitVal = editUserListingLimit.trim() === '' ? null : Math.max(0, parseInt(editUserListingLimit) || 0);
    await supabase.from('profiles').update({
      display_name: editUserDisplayName.trim() || null,
      preferred_lang: editUserLang,
      phone: editUserPhone.trim() || null,
      whatsapp: editUserWhatsapp.trim() || null,
      listing_limit_override: listingLimitVal,
    } as any).eq('id', selectedUser.id);

    await logAction('edit_user', 'user', selectedUser.id, { fields: ['display_name', 'preferred_lang', 'phone', 'whatsapp', 'listing_limit_override'] });

    // Handle points
    if (selectedUser.user_type !== 'business') {
      const currentPts = allUserPoints?.find((p: any) => p.user_id === selectedUser.id);
      const newBalance = Math.max(0, parseInt(editUserPoints) || 0);
      if (newBalance !== (currentPts?.balance || 0)) {
        await supabase.functions.invoke('manage-points', { body: { action: 'admin_set_balance', target_user_id: selectedUser.id, new_balance: newBalance } });
        qc.invalidateQueries({ queryKey: ['admin-user-points'] });
      }
    }

    // Handle subscription
    if (selectedUser.user_type === 'business') {
      const activeSub = (proSubscriptions || []).find((s: any) => s.user_id === selectedUser.id && s.status === 'active');
      if (editSubStatus === 'none' && activeSub) {
        await supabase.from('pro_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', activeSub.id);
        await logAction('cancel_subscription', 'subscription', activeSub.id);
      } else if (editSubStatus === 'active') {
        const durationMonths = Math.max(1, parseInt(editSubDurationMonths) || 1);
        const boostsIncluded = editSubPlanType === 'agence' ? 10 : editSubPlanType === 'vendeur_pro' ? 3 : 0;
        const priceIdr = editSubPlanType === 'agence' ? 249000 : editSubPlanType === 'vendeur_pro' ? 99000 : 0;
        if (activeSub) {
          const newExpiry = new Date(); newExpiry.setMonth(newExpiry.getMonth() + durationMonths);
          await supabase.from('pro_subscriptions').update({ plan_type: editSubPlanType, expires_at: newExpiry.toISOString(), monthly_boosts_included: boostsIncluded, price_idr: priceIdr }).eq('id', activeSub.id);
          await logAction('update_subscription', 'subscription', activeSub.id, { plan_type: editSubPlanType });
        } else {
          const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
          await supabase.from('pro_subscriptions').insert({ user_id: selectedUser.id, plan_type: editSubPlanType, status: 'active', started_at: new Date().toISOString(), expires_at: expiresAt.toISOString(), monthly_boosts_included: boostsIncluded, price_idr: priceIdr, payment_method: 'admin' });
          await logAction('create_subscription', 'subscription', selectedUser.id, { plan_type: editSubPlanType });
        }
      }
      await qc.invalidateQueries({ queryKey: ['admin-pro-subscriptions'] });
    }

    setSelectedUser((prev: any) => prev ? { ...prev, display_name: editUserDisplayName.trim() || null, preferred_lang: editUserLang, phone: editUserPhone.trim() || null, whatsapp: editUserWhatsapp.trim() || null, listing_limit_override: listingLimitVal } : null);
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    setEditingUser(false);
    toast({ title: t('admin.profileSaved') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> {t('admin.users')} ({profiles?.length || 0})
        </h2>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={bulkBan}>
            <Ban className="h-3 w-3 mr-1" /> Bannir {selectedIds.size} sélectionnés
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('admin.searchUsers')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm" />
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allTypes') || 'All types'}</SelectItem>
            <SelectItem value="private">{t('profile.private')}</SelectItem>
            <SelectItem value="business">{t('profile.business')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === filteredProfiles.length && filteredProfiles.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedIds(new Set(filteredProfiles.map((p: any) => p.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </TableHead>
              <TableHead>{t('admin.colName')}</TableHead>
              <TableHead>{t('admin.colType')}</TableHead>
              <TableHead>{t('admin.colDate')}</TableHead>
              <TableHead>{t('admin.colStatus')}</TableHead>
              <TableHead>{t('admin.listings')}</TableHead>
              <TableHead>{t('admin.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noResults')}</TableCell></TableRow>
            ) : filteredProfiles.map((p: any) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(p)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                </TableCell>
                <TableCell className="font-medium">{p.display_name || t('adminLabels.unknown')}</TableCell>
                <TableCell><Badge variant="outline">{t(`profile.${p.user_type}`)}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {p.is_banned ? <Badge variant="destructive">{t('admin.banned')}</Badge> : <Badge variant="secondary">{t('admin.activeStat')}</Badge>}
                    {p.is_verified_seller && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]"><ShieldCheck className="h-3 w-3 mr-0.5" /></Badge>}
                    {!p.is_verified_seller && idVerifications?.some((v: any) => v.user_id === p.id && v.status === 'pending') && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"><Clock className="h-3 w-3 mr-0.5" /></Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{getActiveListingCount(p.id)} / {getMaxListings(p.id) >= 9999 ? '∞' : getMaxListings(p.id)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedUser(p); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* User detail dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open && !editingUser) setSelectedUser(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => { if (editingUser) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (editingUser) { e.preventDefault(); setEditingUser(false); } }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <div>
                  <p>{selectedUser.display_name || t('adminLabels.unknown')}</p>
                  <p className="text-sm font-normal text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}...</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-2">
              {selectedUser.is_banned ? <Badge variant="destructive">{t('admin.banned')}</Badge> : <Badge variant="secondary">{t('admin.activeStat')}</Badge>}
              <Badge variant="outline">{t(`profile.${selectedUser.user_type}`)}</Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.userInfo')}</h4>
                {!editingUser ? (
                  <Button size="sm" variant="ghost" onClick={startEditUser}><Pencil className="h-3 w-3 mr-1" /> {t('common.edit')}</Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveUserEdits}><Save className="h-3 w-3 mr-1" /> {t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingUser(false)}><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>

              {editingUser ? (
                <div className="space-y-3">
                  <div><label className="text-xs text-muted-foreground">{t('profile.displayName')}</label><Input value={editUserDisplayName} onChange={e => setEditUserDisplayName(e.target.value)} /></div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('profile.preferredLang')}</label>
                    <Select value={editUserLang} onValueChange={setEditUserLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['en','id','fr','es','zh','de','nl','ru','tr','ar','hi','ja'].map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">{t('profile.phone')}</label><Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} placeholder="+62..." /></div>
                  <div><label className="text-xs text-muted-foreground">{t('profile.whatsapp')}</label><Input value={editUserWhatsapp} onChange={e => setEditUserWhatsapp(e.target.value)} placeholder="+62..." /></div>
                  {selectedUser.user_type === 'business' ? (
                    <>
                      <Separator /><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abonnement Pro</h4>
                      <div><label className="text-xs text-muted-foreground">Statut</label>
                        <Select value={editSubStatus} onValueChange={setEditSubStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="none">Aucun abonnement</SelectItem><SelectItem value="active">Actif</SelectItem>
                        </SelectContent></Select>
                      </div>
                      {editSubStatus === 'active' && (
                        <>
                          <div><label className="text-xs text-muted-foreground">Plan</label>
                            <Select value={editSubPlanType} onValueChange={setEditSubPlanType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                              <SelectItem value="free_pro">Pro Gratuit</SelectItem><SelectItem value="vendeur_pro">Vendeur Pro (99k/mois)</SelectItem><SelectItem value="agence">Agence (249k/mois)</SelectItem>
                            </SelectContent></Select>
                          </div>
                          <div><label className="text-xs text-muted-foreground">Durée (mois)</label><Input type="number" min="1" max="12" value={editSubDurationMonths} onChange={e => setEditSubDurationMonths(e.target.value)} /><p className="text-[10px] text-muted-foreground mt-1">À partir d'aujourd'hui</p></div>
                        </>
                      )}
                    </>
                  ) : (
                    <div><label className="text-xs text-muted-foreground">{t('admin.shopPoints') || 'Points'}</label><Input type="number" min="0" value={editUserPoints} onChange={e => setEditUserPoints(e.target.value)} /></div>
                  )}
                  <div><label className="text-xs text-muted-foreground">{t('admin.maxListings')}</label><Input type="number" min="0" value={editUserListingLimit} onChange={e => setEditUserListingLimit(e.target.value)} placeholder="Auto" /><p className="text-[10px] text-muted-foreground mt-1">{t('admin.listingLimitDefault')}</p></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('admin.colDate')}</p><p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('profile.preferredLang')}</p><p className="font-medium">{selectedUser.preferred_lang?.toUpperCase()}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('profile.phone')}</p><p className="font-medium">{selectedUser.phone || '—'}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('profile.whatsapp')}</p><p className="font-medium">{selectedUser.whatsapp || '—'}</p></div></div>
                  {selectedUser.user_type === 'business' ? (() => {
                    const userSubs = (proSubscriptions || []).filter((s: any) => s.user_id === selectedUser.id);
                    const activeSub = userSubs.find((s: any) => s.status === 'active' && new Date(s.expires_at) > new Date());
                    const planLabels: Record<string, string> = { free_pro: 'Pro Gratuit', vendeur_pro: 'Vendeur Pro', agence: 'Agence' };
                    return (
                      <div className="col-span-2 p-3 rounded-lg border bg-muted/30 space-y-2">
                        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Abonnement Pro</span></div>
                        {activeSub ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between"><span className="text-sm">{planLabels[activeSub.plan_type] || activeSub.plan_type}</span><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Actif</Badge></div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /><span>Expire: {new Date(activeSub.expires_at).toLocaleDateString()}</span></div>
                            <div className="text-xs text-muted-foreground">Boosts: {activeSub.monthly_boosts_used}/{activeSub.monthly_boosts_included}</div>
                          </div>
                        ) : <p className="text-sm text-muted-foreground">Aucun abonnement actif</p>}
                      </div>
                    );
                  })() : (
                    <div className="flex items-center gap-2 text-sm"><Coins className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">Points</p><p className="font-medium">{allUserPoints?.find((p: any) => p.user_id === selectedUser.id)?.balance || 0} pts</p></div></div>
                  )}
                  <div className="flex items-center gap-2 text-sm"><Package className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('admin.maxListings')}</p><p className="font-medium">{getUserListings(selectedUser.id).filter((l: any) => l.status === 'active').length} / {getMaxListings(selectedUser.id)}</p></div></div>
                </div>
              )}
            </div>

            <Separator />

            {/* Listings summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.userListings')}</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: t('admin.totalListings'), value: getUserListings(selectedUser.id).length },
                  { label: t('myListings.active'), value: getUserListings(selectedUser.id).filter((l: any) => l.status === 'active').length },
                  { label: t('myListings.sold'), value: getUserListings(selectedUser.id).filter((l: any) => l.status === 'sold').length },
                  { label: t('myListings.archived'), value: getUserListings(selectedUser.id).filter((l: any) => l.status === 'archived').length },
                ].map(s => <Card key={s.label}><CardContent className="p-3 text-center"><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></CardContent></Card>)}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button className="flex-1" variant={selectedUser.is_banned ? 'default' : 'destructive'} onClick={() => banUser(selectedUser.id, !selectedUser.is_banned)}>
                <Ban className="h-4 w-4 mr-1" /> {selectedUser.is_banned ? t('admin.unbanUser') : t('admin.banUser')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
