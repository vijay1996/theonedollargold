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

export default function Subscriptions() {
  const { formatCurrency } = useLocalization();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [deductionDate, setDeductionDate] = useState('');
  const [deductionMonth, setDeductionMonth] = useState('1');
  const [loading, setLoading] = useState(false);

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
        const [{ data: catData, error: catErr }, { data: subData, error: subErr }] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('subscriptions').select('*').eq('uid', user.uid)
        ]);
        if (catErr) throw catErr;
        if (subErr) throw subErr;
        setCategories(catData || []);
        setSubscriptions(subData || []);

        const chanTopic = `public:subscriptions_categories_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(res => { if (!res.error) setCategories(res.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('subscriptions').select('*').eq('uid', user.uid).then(res => { if (!res.error) setSubscriptions(res.data || []); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/subscriptions");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !categoryId || !deductionDate || !auth.currentUser) return;
    setLoading(true);
    try {
      const id = uuidv4();
      const user = auth.currentUser || await auth.getUser();
      const payload = {
        id,
        uid: user.uid,
        name,
        amount: parseFloat(amount),
        category_id: categoryId,
        frequency,
        deduction_date: parseInt(deductionDate, 10),
        deduction_month: frequency === 'yearly' ? parseInt(deductionMonth, 10) : null,
        created_at: new Date().getTime(),
        updated_at: new Date().getTime()
      };
      const { error } = await db.from('subscriptions').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      setSubscriptions(prev => {
        const list = (prev || []).filter(s => s.id !== id);
        return [payload, ...list];
      });
      // If deduction day is today, create an immediate transaction
      try {
        const today = new Date().getDate();
        if (parseInt(deductionDate, 10) === today) {
          const txId = uuidv4();
          const tx = {
            id: txId,
            uid: user.uid,
            date: new Date().toISOString().slice(0,10),
            category_id: categoryId,
            amount: parseFloat(amount),
            type: 'expense',
            comment: `Subscription: ${name}`,
            subscription_id: id,
            created_at: new Date().getTime(),
            updated_at: new Date().getTime()
          };
          const { error: txErr } = await db.from('transactions').upsert([tx], { onConflict: 'id' });
          if (txErr) console.warn('Failed to insert immediate subscription transaction', txErr);
        }
      } catch (e) {
        console.warn('Immediate transaction check failed', e);
      }
      setOpen(false);
      setName('');
      setAmount('');
      setDeductionDate('');
      setDeductionMonth('1');
      toast.success('Subscription added');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, "users/" + auth.currentUser.uid + "/subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
      await db.from('subscriptions').delete().eq('id', id).eq('uid', user.uid);
      toast.success('Subscription deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/subscriptions/" + id);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating subscriptions" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">Manage your recurring payments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
            <Plus className="h-4 w-4 mr-2" /> Add Subscription
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Netflix" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger><SelectValue placeholder="Select category">{categoryId ? getCategoryName(categoryId) : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue placeholder="Select frequency">{frequency === 'yearly' ? 'Yearly' : 'Monthly'}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {frequency === 'yearly' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deduction Month</label>
                  <Select value={deductionMonth} onValueChange={setDeductionMonth}>
                    <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}).map((_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Deduction Day</label>
                <Input type="number" min="1" max="31" value={deductionDate} onChange={(e) => setDeductionDate(e.target.value)} required placeholder="e.g. 15" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">Save Subscription</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map(s => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{s.name}</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="break-words text-2xl font-bold tracking-tight mb-2">{formatCurrency(s.amount)}</div>
              <p className="text-sm text-muted-foreground">{s.frequency} on day {s.deduction_date || s.deductionDate}</p>
              <p className="text-xs text-muted-foreground mt-1">Category: {getCategoryName(s.category_id || s.categoryId)}</p>
            </CardContent>
          </Card>
        ))}
        {subscriptions.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No subscriptions added.</div>}
      </div>
    </div>
  );
}
