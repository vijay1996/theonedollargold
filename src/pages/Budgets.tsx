import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';
import { Budget, Category, Transaction } from './reports/useReportsData';
import { primaryButtonClass } from '../lib/constants';

export default function Budgets() {
  const { formatCurrency } = useLocalization();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);

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
        const [{ data: catData }, { data: budData }, { data: transData }] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('budgets').select('*').eq('uid', user.uid),
          db.from('transactions').select('*').eq('uid', user.uid)
        ]);
        setCategories(catData || []);
        setBudgets(budData || []);
        setTransactions(transData || []);

        const chanTopic = `public:budgets_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(r => { if (!r.error) setCategories(r.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `uid=eq.${user.uid}` }, () => {
            db.from('budgets').select('*').eq('uid', user.uid).then(r => { if (!r.error) setBudgets(r.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('transactions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setTransactions(r.data || []); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/budgets");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !limit || !auth.currentUser) return;
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      const id = uuidv4();
      const payload = { id, uid: user.uid, category_id: categoryId, limit_amount: parseFloat(limit), period, created_at: new Date().getTime(), updated_at: new Date().getTime() };
      const { error } = await db.from('budgets').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      setBudgets((prev: Budget[]) => {
        const list = (prev || []).filter(b => b.id !== id);
        return [payload as Budget, ...list];
      });
      setOpen(false);
      setLimit('');
      toast.success('Budget added');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, "users/" + auth.currentUser.uid + "/budgets");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      await db.from('budgets').delete().eq('id', id).eq('uid', user.uid);
      setBudgets(prev => (prev || []).filter(b => b.id !== id));
      toast.success('Budget deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/budgets/" + id);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';
  
  // Calculate progress for each budget
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating budgets" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Budgets</h2>
          <p className="text-muted-foreground">Track your spending limits by category.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button className={`flex items-center ${primaryButtonClass}`}><Plus className="h-4 w-4 mr-2" /> Add Budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryId} onValueChange={v => setCategoryId(String(v))} required>
                  <SelectTrigger><SelectValue placeholder="Select category">{categoryId ? getCategoryName(categoryId) : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit Amount</label>
                <Input type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select value={period} onValueChange={v => setPeriod(String(v))}>
                  <SelectTrigger><SelectValue placeholder="Select period">{period === 'yearly' ? 'Yearly' : 'Monthly'}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full">Save Budget</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(b => {
          // calculate spent
          const spent = transactions.filter(t => {
            const tCategory = t.category_id;
            const bCategory = b.category_id;
            if (tCategory !== bCategory || t.type !== 'expense') return false;
            const d = new Date(t.date);
            if (b.period === 'monthly') {
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            } else {
              return d.getFullYear() === currentYear;
            }
          }).reduce((acc, curr) => acc + curr.amount, 0);

          const percent = Math.min(100, Math.max(0, (spent / (b.limit_amount || 1)) * 100));
          const isWarning = percent > 80;
          const isDanger = percent >= 100;

          return (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{getCategoryName(b.category_id)}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight mb-4">
                  {formatCurrency(spent)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(b.limit_amount || 0)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div 
                    className={"h-2.5 rounded-full " + (isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500')} 
                    style={{ width: percent + "%" }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">{percent.toFixed(1)}% spent ({b.period})</p>
              </CardContent>
            </Card>
          );
        })}
        {budgets.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            No budgets created yet. Set a budget to track spending.
          </div>
        )}
      </div>
    </div>
  );
}
