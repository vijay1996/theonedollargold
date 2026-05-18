import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    if (!auth.currentUser) return;
    const catRef = collection(db, 'users', auth.currentUser.uid, 'categories');
    const unsubCat = onSnapshot(catRef, (snap) => {
      setCategories(snap.docs.map(d => d.data()));
    }, error => handleFirestoreError(error, OperationType.LIST, "users/" + auth.currentUser?.uid + "/categories"));

    const transRef = collection(db, 'users', auth.currentUser.uid, 'transactions');
    const unsubTrans = onSnapshot(transRef, (snap) => {
      const data = snap.docs.map(d => d.data()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    }, error => handleFirestoreError(error, OperationType.LIST, "users/" + auth.currentUser?.uid + "/transactions"));

    return () => {
      unsubCat();
      unsubTrans();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date || !auth.currentUser) return;
    setLoading(true);
    try {
      const id = uuidv4();
      const ref = doc(db, 'users', auth.currentUser.uid, 'transactions', id);
      await setDoc(ref, {
        id,
        uid: auth.currentUser.uid,
        date,
        categoryId,
        amount: parseFloat(amount),
        type,
        comment,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
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
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
      toast.success('Transaction deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + auth.currentUser.uid + "/transactions/" + id);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Log your daily income and expenses.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" /> Add Transaction
          </DialogTrigger>
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
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input 
              placeholder="Search comments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
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
                <SelectTrigger className="w-[150px]">
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
                  <TableCell className="whitespace-nowrap">{format(new Date(t.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getCategoryName(t.categoryId)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate" title={t.comment}>{t.comment}</TableCell>
                  <TableCell className={t.type === 'income' ? 'text-right font-medium text-green-600 whitespace-nowrap' : 'text-right font-medium text-red-600 whitespace-nowrap'}>
                    {t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
    </div>
  );
}
