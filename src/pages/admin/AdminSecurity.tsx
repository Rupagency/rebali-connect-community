import { useState } from 'react';
import UserDetailDialog from '@/components/admin/UserDetailDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminProfiles, useAdminIdVerifications, useAdminDevices, useAdminBannedDevices } from '@/hooks/useAdminData';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, FileCheck, Fingerprint, Wifi, Ban,
  Eye, X, CheckCircle, RefreshCw, Loader2
} from 'lucide-react';

function VerificationCard({ verification, profileName, onApprove, onReject }: {
  verification: any; profileName: string; onApprove: () => Promise<void>; onReject: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const decryptWithTimeout = async (storagePath: string, timeoutMs = 15000): Promise<Blob> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Le déchiffrement a expiré, réessayez.')), timeoutMs)
    );

    const invokePromise = supabase.functions.invoke('decrypt-document', {
      body: { storage_path: storagePath },
    }) as Promise<any>;

    const res = await Promise.race([invokePromise, timeoutPromise]);

    if (res?.error) {
      throw new Error(res.error.message || 'Erreur lors du déchiffrement');
    }

    if (!(res?.data instanceof Blob)) {
      throw new Error('Réponse de déchiffrement invalide');
    }

    return res.data;
  };

  const loadDecryptedImages = async () => {
    if (loadingImages) return;

    setLoadingImages(true);
    try {
      const uniquePaths = Array.from(
        new Set([verification.document_path, verification.selfie_path].filter(Boolean))
      ) as string[];

      const blobByPath = new Map<string, Blob>();
      await Promise.all(
        uniquePaths.map(async (path) => {
          const blob = await decryptWithTimeout(path);
          blobByPath.set(path, blob);
        })
      );

      const docBlob = verification.document_path ? blobByPath.get(verification.document_path) : null;
      const selfieBlob = verification.selfie_path ? blobByPath.get(verification.selfie_path) : null;

      setDocUrl(docBlob ? URL.createObjectURL(docBlob) : null);
      setSelfieUrl(selfieBlob ? URL.createObjectURL(selfieBlob) : null);
      setReviewed(true);
      setShowImages(true);
    } catch (err: any) {
      console.error('Failed to decrypt images:', err);
      toast({
        title: 'Erreur de déchiffrement',
        description: err?.message || 'Impossible de charger les documents.',
        variant: 'destructive',
      });
      setReviewed(false);
      setShowImages(true);
    } finally {
      setLoadingImages(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{profileName}</p>
          <p className="text-xs text-muted-foreground">{verification.document_type} — {new Date(verification.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Documents section - must view before deciding */}
      {!showImages ? (
        <div className="flex flex-col items-center gap-2 py-4 bg-muted/30 rounded-md border border-dashed">
          <Eye className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Vous devez examiner les documents avant de pouvoir approuver ou rejeter
          </p>
          <Button onClick={loadDecryptedImages} disabled={loadingImages} variant="outline">
            {loadingImages ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            {loadingImages ? 'Déchiffrement...' : 'Voir les documents'}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {docUrl ? (
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Document</p>
                <img src={docUrl} alt="Document" className="rounded-md border max-h-64 object-contain w-full cursor-pointer" onClick={() => window.open(docUrl, '_blank')} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-muted rounded-md border">
                <p className="text-xs text-muted-foreground">Impossible de charger le document</p>
              </div>
            )}
            {selfieUrl ? (
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Selfie</p>
                <img src={selfieUrl} alt="Selfie" className="rounded-md border max-h-64 object-contain w-full cursor-pointer" onClick={() => window.open(selfieUrl, '_blank')} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-muted rounded-md border">
                <p className="text-xs text-muted-foreground">Impossible de charger le selfie</p>
              </div>
            )}
          </div>

          {/* Action buttons - only shown after viewing documents */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button size="sm" onClick={onApprove} disabled={!reviewed}>
              <CheckCircle className="h-4 w-4 mr-1" /> {t('security.approve')}
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject} disabled={!reviewed}>
              <X className="h-4 w-4 mr-1" /> {t('security.reject')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSecurity() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { logAction } = useAdminLog();
  const { data: profiles, isLoading: loadingProfiles } = useAdminProfiles();
  const { data: idVerifications, isLoading: loadingVerifications, refetch: refetchVerifications } = useAdminIdVerifications();
  const { data: allDevices } = useAdminDevices();
  const { data: bannedDevices } = useAdminBannedDevices();

  const dataLoading = loadingProfiles || loadingVerifications;
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSingleId, setRecalcSingleId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const recalculateAll = async () => {
    if (!profiles?.length) return;
    setRecalculating(true);
    let done = 0;
    for (const p of profiles) {
      await supabase.functions.invoke('calculate-trust-score', { body: { user_id: p.id } });
      done++;
      if (done % 10 === 0) console.log(`[Trust] ${done}/${profiles.length} recalculated`);
    }
    await qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    setRecalculating(false);
    toast({ title: `${done} scores recalculés` });
  };

  const recalculateSingle = async (userId: string) => {
    setRecalcSingleId(userId);
    await supabase.functions.invoke('calculate-trust-score', { body: { user_id: userId } });
    await qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    setRecalcSingleId(null);
    toast({ title: 'Score recalculé' });
  };

  const approveVerification = async (v: any) => {
    await supabase.from('id_verifications').update({ status: 'approved' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', v.id);
    await supabase.from('profiles').update({ is_verified_seller: true }).eq('id', v.user_id);
    await supabase.functions.invoke('calculate-trust-score', { body: { user_id: v.user_id } });
    const prof = profiles?.find((p: any) => p.id === v.user_id);
    if (prof?.user_type === 'business') await supabase.functions.invoke('notify-npwp-approved', { body: { user_id: v.user_id } });
    await logAction('approve_verification', 'verification', v.id, { user_id: v.user_id });
    refetchVerifications();
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: t('security.approve') });
  };

  const rejectVerification = async (v: any) => {
    await supabase.from('id_verifications').update({ status: 'rejected' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', v.id);
    await logAction('reject_verification', 'verification', v.id, { user_id: v.user_id });
    refetchVerifications();
    toast({ title: t('security.reject') });
  };

  // Shared device detection
  const sharedHashes = (() => {
    const hashToUsers: Record<string, Set<string>> = {};
    (allDevices || []).forEach((d: any) => {
      if (!hashToUsers[d.device_hash]) hashToUsers[d.device_hash] = new Set();
      hashToUsers[d.device_hash].add(d.user_id);
    });
    return Object.entries(hashToUsers).filter(([, users]) => users.size > 1);
  })();

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Fingerprint className="h-5 w-5" /> {t('security.securityTab')}</h2>

      {/* Security Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-1" /><p className="text-2xl font-bold">{profiles?.filter((p: any) => p.risk_level === 'high').length || 0}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" /><p className="text-2xl font-bold">{profiles?.filter((p: any) => p.risk_level === 'medium').length || 0}</p><p className="text-xs text-muted-foreground">Medium Risk</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ShieldCheck className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{profiles?.filter((p: any) => p.phone_verified).length || 0}</p><p className="text-xs text-muted-foreground">{t('security.whatsappVerified')}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><FileCheck className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{idVerifications?.filter((v: any) => v.status === 'pending').length || 0}</p><p className="text-xs text-muted-foreground">{t('security.pendingVerifications')}</p></CardContent></Card>
      </div>

      {/* Trust Scores */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><Fingerprint className="h-5 w-5" /> {t('security.trustScore')}</h3>
            <Button size="sm" variant="outline" onClick={recalculateAll} disabled={recalculating}>
              {recalculating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {recalculating ? 'Calcul en cours...' : 'Recalculer tous les scores'}
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.colName')}</TableHead>
                  <TableHead>{t('security.trustScore')}</TableHead>
                  <TableHead>{t('security.riskLevel')}</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles || []).sort((a: any, b: any) => (a.trust_score ?? 50) - (b.trust_score ?? 50)).slice(0, 50).map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUserId(p.id)}>
                    <TableCell className="font-medium">{p.display_name || '?'}</TableCell>
                    <TableCell><span className={`font-bold ${p.trust_score < 30 ? 'text-destructive' : p.trust_score < 60 ? 'text-amber-500' : 'text-primary'}`}>{p.trust_score ?? 50}</span></TableCell>
                    <TableCell><Badge variant={p.risk_level === 'high' ? 'destructive' : p.risk_level === 'medium' ? 'outline' : 'secondary'}>{p.risk_level}</Badge></TableCell>
                    <TableCell>{p.phone_verified ? '✅' : '—'}</TableCell>
                    <TableCell>{p.is_verified_seller ? '✅' : '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => recalculateSingle(p.id)} disabled={recalcSingleId === p.id}>
                        {recalcSingleId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Verifications */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2"><FileCheck className="h-5 w-5" /> {t('security.pendingVerifications')}</h3>
          {(!idVerifications || idVerifications.filter((v: any) => v.status === 'pending').length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
          ) : (
            <div className="space-y-4">
              {idVerifications.filter((v: any) => v.status === 'pending').map((v: any) => {
                const vProfile = profiles?.find((p: any) => p.id === v.user_id);
                return <VerificationCard key={v.id} verification={v} profileName={vProfile?.display_name || v.user_id.slice(0, 8)} onApprove={() => approveVerification(v)} onReject={() => rejectVerification(v)} />;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Devices */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Wifi className="h-5 w-5" /> {t('security.linkedAccounts')}</h3>
          {sharedHashes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
          ) : (
            <div className="space-y-3">
              {sharedHashes.map(([hash, userIds]) => (
                <div key={hash} className="p-3 rounded-md border border-destructive/30 bg-destructive/5">
                  <p className="text-xs font-mono text-muted-foreground mb-2">Device: {hash.slice(0, 16)}...</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(userIds).map(uid => {
                      const p = profiles?.find((pr: any) => pr.id === uid);
                      return <Badge key={uid} variant="outline">{p?.display_name || uid.slice(0, 8)}</Badge>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banned Devices */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Ban className="h-5 w-5" /> {t('security.banDevice')}</h3>
          {(!bannedDevices || bannedDevices.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bannedDevices.map((bd: any) => (
                    <TableRow key={bd.id}>
                      <TableCell>{bd.device_hash ? 'Device' : 'Phone'}</TableCell>
                      <TableCell className="font-mono text-xs">{bd.device_hash?.slice(0, 16) || bd.phone_number || '—'}</TableCell>
                      <TableCell className="text-sm">{bd.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(bd.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailDialog
        userId={selectedUserId}
        profile={profiles?.find((p: any) => p.id === selectedUserId)}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
