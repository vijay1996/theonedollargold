import React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Trash2 } from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!auth.currentUser) return;
    const catRef = collection(db, 'users', auth.currentUser.uid, 'categories');
    const unsub = onSnapshot(catRef, (snap) => {
      const data = snap.docs.map(d => d.data());
      setCategories(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users/" + auth.currentUser?.uid + "/categories");
    });
    return () => unsub();
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
      const ref = doc(db, 'users', auth.currentUser.uid, 'categories', id);
      await setDoc(ref, {
        id,
        uid: auth.currentUser.uid,
        name,
        type,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
      });
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
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categories', id));
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.DELETE, "users/" + auth.currentUser.uid + "/categories/" + id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
        <p className="text-muted-foreground">Manage your income and expense categories.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Groceries" />
            </div>
            <div className="w-1/4 space-y-2">
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
            <Button type="submit" disabled={loading}>Add Category</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Your Categories</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
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
        <CardContent className="overflow-x-auto">
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
