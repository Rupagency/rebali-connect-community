import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminListings, useAdminProfiles, useAdminReports } from '@/hooks/useAdminData';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CATEGORY_TREE } from '@/lib/constants';
import {
  FileText, Search, Eye, Pencil, Save, X, Trash2, Archive, CheckCircle,
  Ban, Package, User, Calendar, MapPin, Tag, DollarSign, BarChart2
} from 'lucide-react';

export default function AdminListings() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { logAction } = useAdminLog();
  const { data: allListings } = useAdminListings();
  const { data: profiles } = useAdminProfiles();
  const { data: reports } = useAdminReports();

  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [editingListing, setEditingListing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const categories: string[] = Object.keys(CATEGORY_TREE);

  const filteredListings = allListings?.filter((l: any) => {
    const matchesSearch = !listingSearch || l.title_original?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const archiveListing = async (id: string) => {
    await supabase.from('listings').update({ status: 'archived' as any }).eq('id', id);
    await logAction('archive_listing', 'listing', id);
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    toast({ title: t('admin.archiveListing') });
  };

  const deleteListing = async (id: string) => {
    await supabase.from('listings').delete().eq('id', id);
    await logAction('delete_listing', 'listing', id);
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    toast({ title: t('admin.deleteListing') });
  };

  const bulkArchive = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await supabase.from('listings').update({ status: 'archived' as any }).eq('id', id);
    }
    await logAction('bulk_archive_listings', 'listing', undefined, { count: selectedIds.size });
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} annonces archivées` });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await supabase.from('listings').delete().eq('id', id);
    }
    await logAction('bulk_delete_listings', 'listing', undefined, { count: selectedIds.size });
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} annonces supprimées` });
  };

  const startEditListing = () => {
    if (!selectedListing) return;
    setEditTitle(selectedListing.title_original);
    setEditDescription(selectedListing.description_original);
    setEditCategory(selectedListing.category);
    setEditPrice(String(selectedListing.price));
    setEditingListing(true);
  };

  const saveListingEdits = async () => {
    if (!selectedListing) return;
    const trimmedTitle = editTitle.trim();
    const trimmedDesc = editDescription.trim();
    if (!trimmedTitle || !trimmedDesc) return;
    const priceNum = Math.max(0, Number(editPrice) || 0);
    await supabase.from('listings').update({ title_original: trimmedTitle, description_original: trimmedDesc, category: editCategory as any, price: priceNum }).eq('id', selectedListing.id);
    await logAction('edit_listing', 'listing', selectedListing.id, { title: trimmedTitle });
    setSelectedListing((prev: any) => prev ? { ...prev, title_original: trimmedTitle, description_original: trimmedDesc, category: editCategory, price: priceNum } : null);
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    setEditingListing(false);
    toast({ title: t('admin.listingSaved') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" /> {t('admin.listings')} ({allListings?.length || 0})
        </h2>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={bulkArchive}>
              <Archive className="h-3 w-3 mr-1" /> Archiver {selectedIds.size}
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Supprimer {selectedIds.size}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('admin.searchListings')} value={listingSearch} onChange={(e) => setListingSearch(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('myListings.active')}</SelectItem>
            <SelectItem value="sold">{t('myListings.sold')}</SelectItem>
            <SelectItem value="archived">{t('myListings.archived')}</SelectItem>
            <SelectItem value="draft">{t('myListings.draft')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === filteredListings.length && filteredListings.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedIds(new Set(filteredListings.map((l: any) => l.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </TableHead>
              <TableHead>{t('admin.colTitle')}</TableHead>
              <TableHead>{t('admin.colSeller')}</TableHead>
              <TableHead>{t('admin.colCategory')}</TableHead>
              <TableHead>{t('admin.colPrice')}</TableHead>
              <TableHead>{t('admin.colStatus')}</TableHead>
              <TableHead>{t('admin.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noResults')}</TableCell></TableRow>
            ) : filteredListings.map((l: any) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedListing(l)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{l.title_original}</TableCell>
                <TableCell className="text-sm">{(l.profiles as any)?.display_name || t('adminLabels.unknown')}</TableCell>
                <TableCell><Badge variant="outline">{t(`categories.${l.category}`)}</Badge></TableCell>
                <TableCell className="text-sm">{l.price > 0 ? `${l.currency} ${l.price.toLocaleString()}` : t('common.free')}</TableCell>
                <TableCell><Badge variant={l.status === 'active' ? 'default' : 'secondary'}>{t(`myListings.${l.status}`)}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedListing(l); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Listing detail dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={(open) => { if (!open && !editingListing) { setSelectedListing(null); setEditingListing(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => { if (editingListing) e.preventDefault(); }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{selectedListing.title_original}</p>
                  <p className="text-sm font-normal text-muted-foreground">ID: {selectedListing.id.slice(0, 8)}...</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <Badge variant={selectedListing.status === 'active' ? 'default' : 'secondary'}>{t(`myListings.${selectedListing.status}`)}</Badge>
              <Badge variant="outline">{t(`categories.${selectedListing.category}`)}</Badge>
              <Badge variant="outline">{t(`condition.${selectedListing.condition}`)}</Badge>
            </div>

            <Separator />

            {editingListing ? (
              <div className="space-y-4">
                <div><label className="text-sm font-medium">{t('admin.colTitle')}</label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} /></div>
                <div><label className="text-sm font-medium">{t('admin.colCategory')}</label>
                  <Select value={editCategory} onValueChange={setEditCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>)}
                  </SelectContent></Select>
                </div>
                <div><label className="text-sm font-medium">{t('admin.colPrice')} ({selectedListing.currency})</label><Input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></div>
                <div><label className="text-sm font-medium">Description</label><textarea className="w-full min-h-[100px] p-3 border rounded-md text-sm bg-background" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
                <div className="flex gap-2">
                  <Button onClick={saveListingEdits}><Save className="h-4 w-4 mr-1" /> {t('common.save')}</Button>
                  <Button variant="ghost" onClick={() => setEditingListing(false)}><X className="h-4 w-4 mr-1" /> {t('common.cancel')}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">{t('admin.colPrice')}</p><p className="font-medium">{selectedListing.price > 0 ? `${selectedListing.currency} ${selectedListing.price.toLocaleString()}` : t('common.free')}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">Location</p><p className="font-medium">{selectedListing.location_area}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><BarChart2 className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">Vues</p><p className="font-medium">{selectedListing.views_count}</p></div></div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-muted-foreground">Créé le</p><p className="font-medium">{new Date(selectedListing.created_at).toLocaleDateString()}</p></div></div>
                </div>
                <Separator />
                <div><h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Description</h4><p className="text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto border rounded-md p-3 bg-muted/30">{selectedListing.description_original}</p></div>
                <Separator />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={startEditListing}><Pencil className="h-4 w-4 mr-1" /> {t('common.edit')}</Button>
                  {selectedListing.status !== 'archived' && <Button variant="outline" size="sm" onClick={() => { archiveListing(selectedListing.id); setSelectedListing((prev: any) => prev ? { ...prev, status: 'archived' } : null); }}><Archive className="h-4 w-4 mr-1" /> {t('admin.archiveListing')}</Button>}
                  {selectedListing.status !== 'active' && selectedListing.status !== 'sold' && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      await supabase.from('listings').update({ status: 'active' as any }).eq('id', selectedListing.id);
                      await logAction('reactivate_listing', 'listing', selectedListing.id);
                      qc.invalidateQueries({ queryKey: ['admin-listings'] });
                      setSelectedListing((prev: any) => prev ? { ...prev, status: 'active' } : null);
                    }}><CheckCircle className="h-4 w-4 mr-1" /> {t('admin.reactivate')}</Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => { deleteListing(selectedListing.id); setSelectedListing(null); }}><Trash2 className="h-4 w-4 mr-1" /> {t('common.delete')}</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
