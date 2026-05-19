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
import { Trash2 } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

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
        const { data, error } = await db.from('categories').select('*').eq('uid', user.uid);
        if (error) throw error;
        setCategories(data || []);

        const chanTopic = `public:categories_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, payload => {
            // fetch latest list on any change
            db.from('categories').select('*').eq('uid', user.uid).then(res => {
              if (res.error) return;
              setCategories(res.data || []);
            });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/categories");
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
    
    // Duplicate check
    const exists = categories.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.type === type);
    if (exists) {
      toast.error(`An ${type} category named "${name}" already exists.`);
      return;
    }
    
    setLoading(true);
    try {
      const id = uuidv4();
      const user = auth.currentUser || await auth.getUser();
      const payload = { id, uid: user.uid, name, type, created_at: new Date().getTime(), updated_at: new Date().getTime() };
      // Use upsert with onConflict on id to avoid primary-key conflicts (HTTP 409)
      const { error } = await db.from('categories').upsert([payload], { onConflict: 'id' });
      if (error) {
        if ((error as any).status === 409) {
          toast.error('Category already exists (conflict).');
        } else {
          throw error;
        }
      } else {
        // Optimistically update UI immediately so user sees the new category without waiting for realtime
        setCategories(prev => {
          const filtered = (prev || []).filter(c => c.id !== payload.id);
          return [...filtered, payload];
        });
      }
      setName('');
      toast.success('Category added');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.CREATE, "users/" + auth.currentUser.uid + "/categories");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || await auth.getUser();
      await db.from('categories').delete().eq('id', id).eq('uid', user.uid);
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + (auth.currentUser?.uid || '') + "/categories/" + id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating categories" />
      <div className="min-w-0">
        <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
        <p className="text-muted-foreground">Manage your income and expense categories.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Groceries" />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type">{type === 'income' ? 'Income' : 'Expense'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full self-end sm:w-auto">Add Category</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Your Categories</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input 
              placeholder="Search categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="All filter">
                  {filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expense'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 sm:px-4">
          {categories.filter(c => {
            if (filterType !== 'all' && c.type !== filterType) return false;
            if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          }).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No categories found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.filter(c => {
                  if (filterType !== 'all' && c.type !== filterType) return false;
                  if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  return true;
                }).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold " + (c.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {c.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
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
    </div>
  );
}
