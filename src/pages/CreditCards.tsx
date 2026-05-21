import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { CreditCard } from './reports/useReportsData';
import { primaryButtonClass } from '../lib/constants';

export default function CreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
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
        const { data, error } = await db.from('credit_cards').select('*').eq('uid', user.uid);
        if (error) throw error;
        setCards(data || []);
          const chanTopic = `public:credit_cards_${user.uid}_${Date.now()}`;
          channel = db.channel(chanTopic).on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards', filter: `uid=eq.${user.uid}` }, () => {
            db.from('credit_cards').select('*').eq('uid', user.uid).then(r => { if (!r.error) setCards(r.data || []); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/creditCards");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dueDate || !auth.currentUser) return;
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      const id = uuidv4();
      const payload = { id, uid: user.uid, name, due_date: parseInt(dueDate, 10), created_at: new Date().getTime(), updated_at: new Date().getTime() };
      const { error } = await db.from('credit_cards').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      setCards((prev: CreditCard[]) => {
        const list = (prev || []).filter(c => c.id !== id);
        return [payload as CreditCard, ...list];
      });
      setOpen(false);
      setName('');
      setDueDate('');
      toast.success('Credit Card added');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, "users/" + auth.currentUser.uid + "/creditCards");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      await db.from('credit_cards').delete().eq('id', id).eq('uid', user.uid);
      setCards(prev => (prev || []).filter(c => c.id !== id));
      toast.success('Credit Card deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/creditCards/" + id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating cards" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Credit Cards</h2>
          <p className="text-muted-foreground">Manage credit cards and due dates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button className={`flex items-center ${primaryButtonClass}`}><Plus className="h-4 w-4 mr-2" /> Add Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credit Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Card Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Chase Sapphire" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date (Day of month)</label>
                <Input type="number" min="1" max="31" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required placeholder="e.g. 15" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">Save Card</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(c => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{c.name}</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent>
                <p className="break-words text-xl font-bold sm:text-2xl">Due on the { c.due_date }{c.due_date === 1 ? 'st' : c.due_date === 2 ? 'nd' : c.due_date === 3 ? 'rd' : 'th'}</p>
            </CardContent>
          </Card>
        ))}
        {cards.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No credit cards added.</div>}
      </div>
    </div>
  );
}
