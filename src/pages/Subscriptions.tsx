import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus } from 'lucide-react';

export default function Subscriptions() {
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
    if (!auth.currentUser) return;
    const catRef = collection(db, 'users', auth.currentUser.uid, 'categories');
    const unsubCat = onSnapshot(catRef, (snap) => setCategories(snap.docs.map(d => d.data())));

    const subRef = collection(db, 'users', auth.currentUser.uid, 'subscriptions');
    const unsubSub = onSnapshot(subRef, (snap) => setSubscriptions(snap.docs.map(d => d.data())), (err) => handleFirestoreError(err, OperationType.LIST, "users/" + auth.currentUser?.uid + "/subscriptions"));

    return () => { unsubCat(); unsubSub(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !categoryId || !deductionDate || !auth.currentUser) return;
    setLoading(true);
    try {
      const id = uuidv4();
      const ref = doc(db, 'users', auth.currentUser.uid, 'subscriptions', id);
      await setDoc(ref, {
        id,
        uid: auth.currentUser.uid,
        name,
        amount: parseFloat(amount),
        categoryId,
        frequency,
        deductionDate: parseInt(deductionDate, 10),
        deductionMonth: frequency === 'yearly' ? parseInt(deductionMonth, 10) : null,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
      });
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
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'subscriptions', id));
      toast.success('Subscription deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + auth.currentUser.uid + "/subscriptions/" + id);
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">Manage your recurring payments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
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
              <div className="text-2xl font-bold tracking-tight mb-2">${parseFloat(s.amount).toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">{s.frequency} on day {s.deductionDate}</p>
              <p className="text-xs text-muted-foreground mt-1">Category: {getCategoryName(s.categoryId)}</p>
            </CardContent>
          </Card>
        ))}
        {subscriptions.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No subscriptions added.</div>}
      </div>
    </div>
  );
}
