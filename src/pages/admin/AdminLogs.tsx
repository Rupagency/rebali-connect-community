import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminProfiles, useAdminLogs } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText, User, Clock } from 'lucide-react';

export default function AdminLogs() {
  const { t } = useLanguage();
  const { data: profiles } = useAdminProfiles();
  const { data: logs, isLoading } = useAdminLogs();

  const actionLabels: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
    ban_user: { label: t('adminPage.actionBan'), variant: 'destructive' },
    unban_user: { label: t('adminPage.actionUnban'), variant: 'default' },
    bulk_ban_users: { label: t('adminPage.actionBulkBan'), variant: 'destructive' },
    archive_listing: { label: t('adminPage.actionArchive'), variant: 'outline' },
    delete_listing: { label: t('adminPage.actionDelete'), variant: 'destructive' },
    bulk_archive_listings: { label: t('adminPage.actionBulkArchive'), variant: 'outline' },
    bulk_delete_listings: { label: t('adminPage.actionBulkDelete'), variant: 'destructive' },
    edit_listing: { label: t('adminPage.actionEditListing'), variant: 'secondary' },
    reactivate_listing: { label: t('adminPage.actionReactivate'), variant: 'default' },
    edit_user: { label: t('adminPage.actionEditUser'), variant: 'secondary' },
    resolve_report: { label: t('adminPage.actionResolveReport'), variant: 'default' },
    bulk_resolve_reports: { label: t('adminPage.actionBulkResolve'), variant: 'default' },
    approve_verification: { label: t('adminPage.actionApproveVerif'), variant: 'default' },
    reject_verification: { label: t('adminPage.actionRejectVerif'), variant: 'destructive' },
    block_conversation: { label: t('adminPage.actionBlockConv'), variant: 'destructive' },
    unblock_conversation: { label: t('adminPage.actionUnblockConv'), variant: 'default' },
    create_subscription: { label: t('adminPage.actionCreateSub'), variant: 'default' },
    update_subscription: { label: t('adminPage.actionUpdateSub'), variant: 'secondary' },
    cancel_subscription: { label: t('adminPage.actionCancelSub'), variant: 'destructive' },
  };

  const getAdminName = (adminId: string) => {
    const profile = profiles?.find((p: any) => p.id === adminId);
    return profile?.display_name || adminId.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ScrollText className="h-5 w-5" /> {t('adminPage.activityLog')}
      </h2>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('adminPage.noActivity')}</p>
              <p className="text-xs mt-1">{t('adminPage.actionsTrackedAuto')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('adminPage.colDate')}</TableHead>
                    <TableHead>{t('adminPage.colAdmin')}</TableHead>
                    <TableHead>{t('adminPage.colAction')}</TableHead>
                    <TableHead>{t('adminPage.colType')}</TableHead>
                    <TableHead>{t('adminPage.colTarget')}</TableHead>
                    <TableHead>{t('adminPage.colDetails')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const actionInfo = actionLabels[log.action] || { label: log.action, variant: 'secondary' as const };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {getAdminName(log.admin_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionInfo.variant} className="text-[10px]">
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.target_type}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.target_id?.slice(0, 8) || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                          {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
