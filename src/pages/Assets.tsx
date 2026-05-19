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
import { Trash2, Wallet, CreditCard } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';

const ASSET_CATEGORIES = [
  'Cash & Savings',
  'Investments',
  'Property & Physical Assets',
  'Retirement',
  'Business Assets',
  'Receivables'
];

const LIABILITY_CATEGORIES = [
  'Loans & Debt',
  'Bills & Recurring Expenses',
  'Taxes',
  'Business Obligations',
  'Personal Debt'
];

export default function Assets() {
  const { formatCurrency } = useLocalization();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'asset'|'liability'>('asset');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
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
        const { data, error } = await db.from('disclosures').select('*').eq('uid', user.uid);
        if (error) throw error;
        setItems(data || []);

        const chanTopic = `public:disclosures_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'disclosures', filter: `uid=eq.${user.uid}` }, payload => {
            db.from('disclosures').select('*').eq('uid', user.uid).then(res => {
              if (res.error) return;
              setItems(res.data || []);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !auth.currentUser) return;
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);
    try {
      const id = uuidv4();
      const user = auth.currentUser || await auth.getUser();
      const payload = { id, uid: user.uid, name, type, category, amount: parseFloat(amount || '0'), comment, created_at: Date.now(), updated_at: Date.now() };
      const { error } = await db.from('disclosures').upsert([payload], { onConflict: 'id' });
      if (error) {
        throw error;
      } else {
        setItems(prev => {
          const filtered = (prev || []).filter(i => i.id !== payload.id);
          return [...filtered, payload];
        });
      }
      setName(''); setAmount(''); setComment(''); setCategory('');
      toast.success('Disclosure saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
      handleFirestoreError(err, OperationType.CREATE, "users/" + (auth.currentUser?.uid || '') + "/disclosures");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
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

  const categories = type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} label="Updating disclosures" />
      <div className="min-w-0">
        <h2 className="text-3xl font-bold tracking-tight">Assets & Liabilities</h2>
        <p className="text-muted-foreground">Record and manage your personal and business disclosures.</p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Add Disclosure</CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger size="sm">
                  <SelectValue>{type === 'asset' ? 'Asset' : 'Liability'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Select category">{category || 'Select category'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-medium mb-1 block">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank of X savings" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">Amount</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">Comment</label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note" />
            </div>

            <div className="sm:col-span-4 text-right">
              <Button type="submit" size="sm" disabled={loading} className="w-full sm:w-auto">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {i.type === 'asset' ? <Wallet className="h-4 w-4 text-green-600" /> : <CreditCard className="h-4 w-4 text-red-600" />}
                        {i.name}
                      </TableCell>
                      <TableCell>{i.type === 'asset' ? 'Asset' : 'Liability'}</TableCell>
                      <TableCell>{i.category}</TableCell>
                      <TableCell>{formatCurrency(i.amount)}</TableCell>
                      <TableCell className="text-right">
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
    </div>
  );
}
