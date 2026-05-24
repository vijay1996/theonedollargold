import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Wallet, CreditCard, Edit, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';
import { Disclosure, Category } from './reports/useReportsData';
import { primaryButtonClass } from '../lib/constants';
import PageHeader from '../components/layout/PageHeader';

export default function Assets() {
  const { formatCurrency } = useLocalization();
  const [items, setItems] = useState<Disclosure[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'asset'|'liability'>('asset');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [comment, setComment] = useState('');
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
const [open, setOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [filterType, setFilterType] = useState('all'); // all | asset | liability
const [sortBy, setSortBy] = useState('Date ↓'); // Date ↓ is default
const [bulkOpen, setBulkOpen] = useState(false);
const [bulkText, setBulkText] = useState('');
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
        const [
          { data: discData, error: discErr },
          { data: catData, error: catErr }
        ] = await Promise.all([
          db.from('disclosures').select('*').eq('uid', user.uid),
          db.from('categories').select('*').eq('uid', user.uid)
        ]);
        if (discErr) throw discErr;
        if (catErr) throw catErr;
        setItems(discData as Disclosure[] || []);
        setCategoriesList(catData as Category[] || []);

        const chanTopic = `public:disclosures_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'disclosures', filter: `uid=eq.${user.uid}` }, () => {
            db.from('disclosures').select('*').eq('uid', user.uid).then(res => {
              if (res.error) return;
              setItems(res.data as Disclosure[] || []);
            });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/disclosures");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !auth.currentUser) return;
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser!;
      const id = editingId ? editingId : uuidv4();
      const payload = { 
        id, uid: user.uid, name, type, category, 
        amount: parseFloat(amount || '0'), 
        current_value: type === 'asset' ? parseFloat(currentValue || '0') : undefined,
        comment, 
        created_at: editingId ? undefined : Date.now(), 
        updated_at: Date.now() 
      };
      const { error } = await db.from('disclosures').upsert([payload], { onConflict: 'id' });
      if (error) {
        throw error;
      } else {
        if (!editingId && type === 'asset' && category === 'Investments' && payload.amount > 0) {
          try {
            let catId = '';
            const { data: cats } = await db.from('categories').select('id').eq('uid', user.uid).ilike('name', 'Investments');
            if (cats && cats.length > 0) {
              catId = cats[0].id;
            } else {
              catId = uuidv4();
              await db.from('categories').insert([{ id: catId, uid: user.uid, name: 'Investments', type: 'expense', created_at: Date.now(), updated_at: Date.now() }]);
            }
            const transId = uuidv4();
            await db.from('transactions').insert([{
              id: transId,
              uid: user.uid,
              amount: payload.amount as number,
              type: 'expense',
              category_id: catId,
              date: new Date().toISOString(),
              description: `Investment: ${payload.name}`,
              created_at: Date.now(),
              updated_at: Date.now()
            }]);
          } catch (e) {
            console.error('Failed to create auto-transaction for investment', e);
          }
        }
        setItems((prev: Disclosure[]) => {
          const filtered = (prev || []).filter(i => i.id !== payload.id);
          return [...filtered, payload as Disclosure];
        });
      }
      setName(''); setAmount(''); setCurrentValue(''); setComment(''); setCategory('');
      setEditingId(null);
       toast.success(editingId ? 'Disclosure updated' : 'Disclosure saved');
       setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, "users/" + (auth.currentUser?.uid || '') + "/disclosures");
    } finally {
      setLoading(false);
    }
  };

   const handleEdit = (item: Disclosure) => {
     setEditingId(item.id);
     setName(item.name);
     setType(item.type);
     setCategory(String(item.category));
     setAmount(String(item.amount ?? 0));
     setCurrentValue(String(item.current_value ?? 0));
     setComment(item.comment ?? '');
     setOpen(true);
   };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser!;
      await db.from('disclosures').delete().eq('id', id).eq('uid', user.uid);
      setItems(prev => (prev || []).filter(i => i.id !== id));
      toast.success('Removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/disclosures/" + id);
    } finally {
      setLoading(false);
    }
  };

  const categories = type === 'asset' 
    ? categoriesList.filter(c => c.type === 'asset').map(c => c.name) 
    : categoriesList.filter(c => c.type === 'liability').map(c => c.name);

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} label="Updating disclosures" />
      
      <PageHeader title="Assets &amp; Liabilities" description="Record and manage your personal and business disclosures."/>

      {/* Toolbar */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48" />
            <Select value={filterType} onValueChange={v => setFilterType(v as 'all' | 'asset' | 'liability')}>
              <SelectTrigger className="w-30">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as 'Date ↓' | 'Date ↑' | 'Name A-Z' | 'Name Z-A')}>
              <SelectTrigger className="w-37.5">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Date ↓">Date ↓</SelectItem>
                <SelectItem value="Date ↑">Date ↑</SelectItem>
                <SelectItem value="Name A-Z">Name A-Z</SelectItem>
                <SelectItem value="Name Z-A">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          <Button onClick={() => { setOpen(true); setEditingId(null); }} className={`flex items-center ${primaryButtonClass}`}>
            <Plus className="h-4 w-4 mr-2" />Add Disclosure
          </Button>
        </div>
      </CardHeader>

    <Card>
      <CardHeader>
        <CardTitle>Your Disclosures</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No disclosures yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-30"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter(i => {
                  if (filterType !== 'all' && i.type !== filterType) return false;
                  const q = searchQuery.toLowerCase();
                  if (q && !(i.name?.toLowerCase().includes(q) || (i.comment?.toLowerCase().includes(q)))) return false;
                  return true;
                })
                .sort((a,b) => {
                  if (sortBy === 'Date ↓') return (b.created_at||0) - (a.created_at||0);
                  if (sortBy === 'Date ↑') return (a.created_at||0) - (b.created_at||0);
                  if (sortBy === 'Name A-Z') return a.name?.localeCompare(b.name||'') ?? 0;
                  if (sortBy === 'Name Z-A') return b.name?.localeCompare(a.name||'') ?? 0;
                  return 0;
                })
                .map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {i.type === 'asset' ? <Wallet className="h-4 w-4 text-green-600" /> : <CreditCard className="h-4 w-4 text-red-600" />}
                      {i.name}
                    </TableCell>
                    <TableCell>{i.type === 'asset' ? 'Asset' : 'Liability'}</TableCell>
                    <TableCell>{i.category}</TableCell>
                    <TableCell>{formatCurrency(i.current_value ?? i.amount)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(i)}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}>
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

    {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingId(null); setName(''); setAmount(''); setCurrentValue(''); setComment(''); setCategory(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Disclosure' : 'Add Disclosure'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as 'asset' | 'liability')}>
                <SelectTrigger className="w-full">
                  <SelectValue>{type === 'asset' ? 'Asset' : 'Liability'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={v => setCategory(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category">{category || 'Select category'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank of X savings" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{type === 'asset' ? 'Invested Amount' : 'Amount'}</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            {type === 'asset' && (
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Current Value</label>
                <Input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Comment</label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note" />
            </div>
            <div className="sm:col-span-4 text-right flex gap-2 justify-end">
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingId(null); setName(''); setAmount(''); setCurrentValue(''); setComment(''); setCategory(''); }}>Cancel</Button>
              )}
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  </div>
);
}
