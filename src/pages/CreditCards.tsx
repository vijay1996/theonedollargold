import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2, Plus } from 'lucide-react';

export default function CreditCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const ref = collection(db, 'users', auth.currentUser.uid, 'creditCards');
    const unsub = onSnapshot(ref, (snap) => setCards(snap.docs.map(d => d.data())), (err) => handleFirestoreError(err, OperationType.LIST, "users/" + auth.currentUser?.uid + "/creditCards"));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dueDate || !auth.currentUser) return;
    setLoading(true);
    try {
      const id = uuidv4();
      const ref = doc(db, 'users', auth.currentUser.uid, 'creditCards', id);
      await setDoc(ref, {
        id,
        uid: auth.currentUser.uid,
        name,
        dueDate: parseInt(dueDate, 10),
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
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
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'creditCards', id));
      toast.success('Credit Card deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + auth.currentUser.uid + "/creditCards/" + id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credit Cards</h2>
          <p className="text-muted-foreground">Manage credit cards and due dates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" /> Add Card
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
              <p className="text-2xl font-bold">Due on the {c.dueDate}{c.dueDate === 1 ? 'st' : c.dueDate === 2 ? 'nd' : c.dueDate === 3 ? 'rd' : 'th'}</p>
            </CardContent>
          </Card>
        ))}
        {cards.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No credit cards added.</div>}
      </div>
    </div>
  );
}
