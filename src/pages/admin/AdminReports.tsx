import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminReports, useAdminListings, useAdminProfiles } from '@/hooks/useAdminData';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Ban, Archive, CheckCircle } from 'lucide-react';

export default function AdminReports() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: reports } = useAdminReports();
  const { data: allListings } = useAdminListings();
  const { data: profiles } = useAdminProfiles();
  const { logAction } = useAdminLog();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pendingReports = reports?.filter((r: any) => !r.resolved) || [];
  const resolvedReports = reports?.filter((r: any) => r.resolved) || [];

  const getListingForReport = (report: any) => allListings?.find((l: any) => l.id === report.listing_id);
  const getReporterName = (report: any) => profiles?.find((p: any) => p.id === report.reporter_id)?.display_name || t('adminLabels.unknown');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (items: any[]) => {
    setSelectedIds(new Set(items.map((r: any) => r.id)));
  };

  const resolveReport = async (id: string) => {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
    await logAction('resolve_report', 'report', id);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    toast({ title: t('admin.resolve') });
  };

  const bulkResolve = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('reports').update({ resolved: true }).eq('id', id);
    }
    await logAction('bulk_resolve_reports', 'report', undefined, { count: ids.length });
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    setSelectedIds(new Set());
    toast({ title: `${ids.length} signalements résolus` });
  };

  const archiveListing = async (listingId: string) => {
    await supabase.from('listings').update({ status: 'archived' as any }).eq('id', listingId);
    await logAction('archive_listing', 'listing', listingId);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    toast({ title: t('admin.archiveListing') });
  };

  const banUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
    await logAction('ban_user', 'user', userId);
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: t('admin.banUser') });
  };

  const renderReport = (report: any, showActions: boolean) => {
    const listing = getListingForReport(report);
    return (
      <Card key={report.id}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {showActions && (
              <Checkbox
                checked={selectedIds.has(report.id)}
                onCheckedChange={() => toggleSelect(report.id)}
                className="mt-1"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="destructive">{t(`report.${report.reason}`)}</Badge>
                {report.resolved && <Badge variant="secondary">{t('admin.resolved')}</Badge>}
              </div>
              <p className="text-sm font-medium mb-1 truncate">
                {t('adminLabels.listing')}: {listing?.title_original || t('adminLabels.deleted')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('adminLabels.reporter')}: {getReporterName(report)}
              </p>
              {report.details && <p className="text-sm mt-2 text-muted-foreground">{report.details}</p>}
              <p className="text-xs text-muted-foreground mt-1">{new Date(report.created_at).toLocaleDateString()}</p>
            </div>
            {showActions && (
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" onClick={() => resolveReport(report.id)}>
                  <CheckCircle className="h-3 w-3 mr-1" /> {t('admin.resolve')}
                </Button>
                {listing && (
                  <Button size="sm" variant="destructive" onClick={() => archiveListing(listing.id)}>
                    <Archive className="h-3 w-3 mr-1" /> {t('admin.archiveListing')}
                  </Button>
                )}
                {listing?.seller_id && (
                  <Button size="sm" variant="outline" onClick={() => banUser(listing.seller_id)}>
                    <Ban className="h-3 w-3 mr-1" /> {t('admin.banUser')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {t('admin.reports')}
        </h2>
        {selectedIds.size > 0 && (
          <Button onClick={bulkResolve} size="sm">
            <CheckCircle className="h-3 w-3 mr-1" /> Résoudre {selectedIds.size} sélectionnés
          </Button>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">{t('admin.pending')} ({pendingReports.length})</TabsTrigger>
          <TabsTrigger value="resolved">{t('admin.resolved')} ({resolvedReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingReports.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => selectAll(pendingReports)}>
              Tout sélectionner ({pendingReports.length})
            </Button>
          )}
          {pendingReports.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{t('admin.noReports')}</p>
          ) : pendingReports.map((r: any) => renderReport(r, true))}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3 mt-4">
          {resolvedReports.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{t('admin.noReports')}</p>
          ) : resolvedReports.map((r: any) => renderReport(r, false))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
