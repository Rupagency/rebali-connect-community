import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminProfiles } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText, User, Clock } from 'lucide-react';

const actionLabels: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  ban_user: { label: 'Bannir', variant: 'destructive' },
  unban_user: { label: 'Débannir', variant: 'default' },
  bulk_ban_users: { label: 'Ban en masse', variant: 'destructive' },
  archive_listing: { label: 'Archiver', variant: 'outline' },
  delete_listing: { label: 'Supprimer', variant: 'destructive' },
  bulk_archive_listings: { label: 'Archivage en masse', variant: 'outline' },
  bulk_delete_listings: { label: 'Suppression en masse', variant: 'destructive' },
  edit_listing: { label: 'Modifier annonce', variant: 'secondary' },
  reactivate_listing: { label: 'Réactiver', variant: 'default' },
  edit_user: { label: 'Modifier utilisateur', variant: 'secondary' },
  resolve_report: { label: 'Résoudre signalement', variant: 'default' },
  bulk_resolve_reports: { label: 'Résolution en masse', variant: 'default' },
  approve_verification: { label: 'Approuver vérification', variant: 'default' },
  reject_verification: { label: 'Rejeter vérification', variant: 'destructive' },
  block_conversation: { label: 'Bloquer conversation', variant: 'destructive' },
  unblock_conversation: { label: 'Débloquer conversation', variant: 'default' },
  create_subscription: { label: 'Créer abonnement', variant: 'default' },
  update_subscription: { label: 'Modifier abonnement', variant: 'secondary' },
  cancel_subscription: { label: 'Annuler abonnement', variant: 'destructive' },
};

export default function AdminLogs() {
  const { data: profiles } = useAdminProfiles();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return (data || []) as any[];
    },
  });

  const getAdminName = (adminId: string) => {
    const profile = profiles?.find((p: any) => p.id === adminId);
    return profile?.display_name || adminId.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ScrollText className="h-5 w-5" /> Journal d'activité admin
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
              <p>Aucune activité enregistrée</p>
              <p className="text-xs mt-1">Les actions admin seront tracées ici automatiquement</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Détails</TableHead>
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
