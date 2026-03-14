import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';

export default function AdminWARelay() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { logAction } = useAdminLog();

  const { data: relayConversations } = useQuery({
    queryKey: ['admin-relay-conversations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, listings!conversations_listing_id_fkey(title_original), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)')
        .gt('total_msg_count', 0)
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: riskEvents } = useQuery({
    queryKey: ['admin-risk-events'],
    queryFn: async () => {
      const { data } = await supabase.from('risk_events').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const toggleBlock = async (convId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    await supabase.from('conversations').update({ relay_status: newStatus }).eq('id', convId);
    await logAction(newStatus === 'blocked' ? 'block_conversation' : 'unblock_conversation', 'conversation', convId);
    qc.invalidateQueries({ queryKey: ['admin-relay-conversations'] });
    toast({ title: newStatus === 'blocked' ? t('admin.blockConversation') : t('admin.unblockConversation') });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="h-5 w-5" /> {t('admin.waRelay')}</h2>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">{t('admin.relayConversations')}</h3>
          {relayConversations && relayConversations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.colTitle')}</TableHead>
                    <TableHead>{t('admin.buyer')}</TableHead>
                    <TableHead>{t('admin.sellerLabel')}</TableHead>
                    <TableHead>{t('admin.msgCount')}</TableHead>
                    <TableHead>{t('admin.colStatus')}</TableHead>
                    <TableHead>{t('admin.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relayConversations.map((conv: any) => (
                    <TableRow key={conv.id}>
                      <TableCell className="text-sm truncate max-w-[150px]">{conv.listings?.title_original || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.buyer?.display_name || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.seller?.display_name || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.total_msg_count} ({conv.buyer_msg_count}B / {conv.seller_msg_count}S)</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={conv.unlocked ? 'default' : 'secondary'} className="text-[10px]">{conv.unlocked ? t('admin.unlocked') : t('admin.locked')}</Badge>
                          <Badge variant={conv.relay_status === 'blocked' ? 'destructive' : 'outline'} className="text-[10px]">{conv.relay_status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant={conv.relay_status === 'blocked' ? 'default' : 'destructive'} onClick={() => toggleBlock(conv.id, conv.relay_status)}>
                          {conv.relay_status === 'blocked' ? t('admin.unblockConversation') : t('admin.blockConversation')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noConversations')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">{t('admin.riskEvents')}</h3>
          {riskEvents && riskEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Phone</TableHead><TableHead>Event</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {riskEvents.map((ev: any) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-xs">{ev.phone || '—'}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-[10px]">{ev.event_type}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{JSON.stringify(ev.details)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noRiskEvents')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
