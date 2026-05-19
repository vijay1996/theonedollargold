import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
 

export default function Transactions() {
  const { formatCurrency, formatDate } = useLocalization();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<Array<any>>([{ date: format(new Date(), 'yyyy-MM-dd'), type: 'expense', category_id: '', amount: '', comment: '' }]);
  const bulkRowsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let channel: any;
    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || await auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [{ data: catData, error: catErr }, { data: transData, error: transErr }] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('transactions').select('*').eq('uid', user.uid)
        ]);
        if (catErr) throw catErr;
        if (transErr) throw transErr;
        setCategories(catData || []);
        setTransactions((transData || []).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const chanTopic = `public:transactions_categories_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(res => { if (!res.error) setCategories(res.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('transactions').select('*').eq('uid', user.uid).then(res => { if (!res.error) setTransactions((res.data || []).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/transactions");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date || !auth.currentUser) return;
    setLoading(true);
    try {
      const id = uuidv4();
      const user = auth.currentUser || await auth.getUser();
      const payload = {
        id,
        uid: user.uid,
        date,
        category_id: categoryId,
        amount: parseFloat(amount),
        type,
        comment,
        created_at: new Date().getTime(),
        updated_at: new Date().getTime()
      };
      const { error } = await db.from('transactions').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      // optimistic UI update
      setTransactions(prev => {
        const list = (prev || []).filter(t => t.id !== id);
        return [payload, ...list];
      });
      setOpen(false);
      setAmount('');
      setComment('');
      toast.success('Transaction added');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, "users/" + auth.currentUser.uid + "/transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
      await db.from('transactions').delete().eq('id', id).eq('uid', user.uid);
      toast.success('Transaction deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/transactions/" + id);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6 relative">
      <LoadingOverlay show={loading || uploading || editLoading} label="Updating transactions" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Log your daily income and expenses.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
          <Button onClick={() => setOpen(true)} className="flex w-full items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Transaction
          </Button>
          <Button onClick={() => setBulkOpen(true)} className="flex w-full items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Bulk Add
          </Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={(val) => { setType(val); setCategoryId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select type">{type === 'income' ? 'Income' : 'Expense'}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger><SelectValue placeholder="Select category">{categoryId ? getCategoryName(categoryId) : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    {filteredCategories.length === 0 && <div className="p-2 text-sm text-gray-500">No categories found. Create one first.</div>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Comment</label>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">Save Transaction</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Bulk Add Transactions</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => { e.preventDefault(); await handleBulkSave(); }} className="flex min-h-0 flex-col gap-4 pt-2">
              <div ref={bulkRowsRef} className="min-h-0 space-y-3 overflow-y-auto pr-1">
                {bulkRows.map((r, idx) => (
                  <div key={idx} className="rounded-lg border bg-card p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                      <div className="text-sm font-medium">Transaction {idx + 1}</div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeBulkRow(idx)} aria-label="Remove row">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[150px_130px_190px_130px_minmax(180px,1fr)_40px]">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Date</label>
                        <Input className="w-full" type="date" value={r.date} onChange={(e) => updateBulkRow(idx, 'date', e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <Select value={r.type} onValueChange={(val) => updateBulkRow(idx, 'type', val)}>
                          <SelectTrigger className="w-full"><SelectValue>{r.type === 'income' ? 'Income' : 'Expense'}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <Select value={r.category_id} onValueChange={(val) => updateBulkRow(idx, 'category_id', val)}>
                          <SelectTrigger className="w-full"><SelectValue>{r.category_id ? getCategoryName(r.category_id) : 'Select'}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => c.type === r.type).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Amount</label>
                        <Input className="w-full" type="number" step="0.01" value={r.amount} onChange={(e) => updateBulkRow(idx, 'amount', e.target.value)} required placeholder="0.00" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <label className="text-xs font-medium text-muted-foreground">Comment</label>
                        <Input className="w-full" value={r.comment} onChange={(e) => updateBulkRow(idx, 'comment', e.target.value)} placeholder="Optional" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeBulkRow(idx)} aria-label="Remove row" className="hidden self-end lg:flex">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={addBulkRow} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
                <div className="flex gap-2 sm:justify-end">
                  <Button type="button" variant="ghost" onClick={() => setBulkOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
                  <Button type="submit" className="flex-1 sm:flex-none">Save All</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        {/* Upload/AI preview removed — bulk add and manual entry supported */}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input 
              placeholder="Search comments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Filter">
                    {filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expense'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Sort">
                    {sortBy === 'date-desc' ? 'Newest' : sortBy === 'date-asc' ? 'Oldest' : sortBy === 'amount-desc' ? 'Highest' : 'Lowest'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">Amount (Highest)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Lowest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.filter(t => {
                if (filterType !== 'all' && t.type !== filterType) return false;
                if (searchQuery && !(t.comment || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
              }).sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (sortBy === 'date-desc') return dateB - dateA;
                if (sortBy === 'date-asc') return dateA - dateB;
                if (sortBy === 'amount-desc') return b.amount - a.amount;
                if (sortBy === 'amount-asc') return a.amount - b.amount;
                return 0;
              }).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(t.date)}</TableCell>
                  <TableCell>{getCategoryName(t.category_id || t.categoryId)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate" title={t.comment}>{t.comment}</TableCell>
                  <TableCell className={t.type === 'income' ? 'text-right font-medium text-green-600 whitespace-nowrap' : 'text-right font-medium text-red-600 whitespace-nowrap'}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4 text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.filter(t => {
                if (filterType !== 'all' && t.type !== filterType) return false;
                if (searchQuery && !(t.comment || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
              }).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={editType} onValueChange={(val) => { setEditType(val); setEditCategoryId(''); }}>
                <SelectTrigger><SelectValue>{editType === 'income' ? 'Income' : 'Expense'}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId} required>
                <SelectTrigger><SelectValue>{editCategoryId ? getCategoryName(editCategoryId) : undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.type === editType).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment</label>
              <Input value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Optional comment" />
            </div>
            <Button type="submit" disabled={editLoading} className="w-full">Update Transaction</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function openEdit(tx: any) {
    setEditId(tx.id);
    setEditType(tx.type || 'expense');
    setEditAmount(String(tx.amount || ''));
    try {
      setEditDate(format(new Date(tx.date), 'yyyy-MM-dd'));
    } catch (e) {
      setEditDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setEditCategoryId(tx.category_id || tx.categoryId || '');
    setEditComment(tx.comment || '');
    setEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAmount || !editCategoryId || !editDate) return;
    setEditLoading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
      const payload = {
        date: editDate,
        category_id: editCategoryId,
        amount: parseFloat(editAmount),
        type: editType,
        comment: editComment,
        updated_at: new Date().getTime()
      };
      const { error } = await db.from('transactions').update(payload).eq('id', editId).eq('uid', user.uid);
      if (error) throw error;
      setTransactions(prev => (prev || []).map(t => t.id === editId ? { ...t, ...payload } : t));
      setEditOpen(false);
      toast.success('Transaction updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
      handleFirestoreError(err, OperationType.UPDATE, "users/" + (auth.currentUser?.uid || '') + "/transactions/" + editId);
    } finally {
      setEditLoading(false);
    }
  }

  function updateBulkRow(index: number, field: string, value: any) {
    setBulkRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addBulkRow() {
    setBulkRows(prev => ([{ date: format(new Date(), 'yyyy-MM-dd'), type: 'expense', category_id: '', amount: '', comment: '' }, ...prev]));
    requestAnimationFrame(() => {
      bulkRowsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function removeBulkRow(index: number) {
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  }

  async function handleBulkSave() {
    if (!bulkRows || bulkRows.length === 0) return;
    setUploading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
      const toInsert = bulkRows.map(r => ({
        id: uuidv4(),
        uid: user.uid,
        date: r.date || new Date().toISOString().slice(0,10),
        category_id: r.category_id || null,
        amount: Math.abs(parseFloat(String(r.amount || '0'))),
        type: r.type || 'expense',
        comment: r.comment || '',
        created_at: Date.now(),
        updated_at: Date.now()
      }));

      const { error } = await db.from('transactions').insert(toInsert);
      if (error) throw error;
      setTransactions(prev => [...toInsert, ...(prev || [])]);
      setBulkOpen(false);
      setBulkRows([{ date: format(new Date(), 'yyyy-MM-dd'), type: 'expense', category_id: '', amount: '', comment: '' }]);
      toast.success('Imported ' + toInsert.length + ' transactions');
    } catch (err: any) {
      toast.error(err.message || 'Bulk import failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  // File upload and AI classification removed — bulk/manual entry retained
}
