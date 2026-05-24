import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Edit, Plus } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Category } from './reports/useReportsData';
import { primaryButtonClass, secondaryButtonClass } from '../lib/constants';
import PageHeader from '../components/layout/PageHeader';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'asset' | 'liability'>('expense');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'asset' | 'liability'>('all');
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategoryText, setBulkCategoryText] = useState('');
  const [sortBy, setSortBy] = useState('Name A-Z');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load categories and set up realtime listener
  useEffect(() => {
    let channel: any;
    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await db.from('categories').select('*').eq('uid', user.uid);
        if (error) throw error;
        setCategories(data || []);
        const chanTopic = `public:categories_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(res => {
              if (!res.error) setCategories(res.data || []);
            });
          })
          .subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, `users/${user?.uid}/categories`);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const resetForm = () => {
    setName('');
    setType('expense');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !auth.currentUser) return;
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      const id = editingId ? editingId : uuidv4();
      const payload = { id, uid: user.uid, name: name.trim(), type, created_at: editingId ? undefined : Date.now(), updated_at: Date.now() };
      const { error } = await db.from('categories').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      // optimistic UI update
      setCategories((prev: Category[]) => {
        const filtered = (prev || []).filter(c => c.id !== id);
        return [...filtered, payload as Category];
      });
      toast.success(editingId ? 'Category updated' : 'Category added');
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, `users/${auth.currentUser?.uid}/categories`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      await db.from('categories').delete().eq('id', id).eq('uid', user.uid);
      setCategories(prev => (prev || []).filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser?.uid}/categories/${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & searched categories for display
  const displayedCategories = categories
    .filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      const q = searchQuery.toLowerCase();
      return !q || c.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'Name A-Z') return a.name.localeCompare(b.name);
      if (sortBy === 'Name Z-A') return b.name.localeCompare(a.name);
      return 0;
    });

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating categories" />
      
      <PageHeader title="Categories" description="Manage your income, expense, asset and liability categories."/>

      {/* Toolbar */}
    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Select value={sortBy} onValueChange={v => setSortBy(v as 'Name A-Z' | 'Name Z-A')}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Name A-Z">Name A-Z</SelectItem>
          <SelectItem value="Name Z-A">Name Z-A</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={() => { setOpen(true); setBulkCategoryText(''); }} className={`flex items-center ${primaryButtonClass}`}>
        <Plus className="h-4 w-4 mr-2" /> Add
      </Button>
    </div>
    </CardHeader>

      {/* Category Table */}
      <Card>
        <CardContent className="overflow-x-auto">
          {displayedCategories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No categories found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCategories.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.type.charAt(0).toUpperCase() + c.type.slice(1)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Category' : 'Add Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Groceries" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={v=>setType(v as Category['type'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                )}
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
