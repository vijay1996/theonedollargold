import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Plus, Trash2, Target, Clock, TrendingUp } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';
import { Category, Transaction, Goal } from './reports/useReportsData';
import { primaryButtonClass } from '../lib/constants';
import { getUserSubscriptionInfo, isPremium, SubscriptionInfo } from '../lib/razorpay';
import PageHeader from '../components/layout/PageHeader';

const GOAL_LIMIT = 2;

export default function Goals() {
  const { formatCurrency } = useLocalization();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const navigate = useNavigate();

  // Form state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

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
        const [{ data: catData }, { data: goalData }, { data: transData }, info] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('goals').select('*').eq('uid', user.uid),
          db.from('transactions').select('*').eq('uid', user.uid),
          getUserSubscriptionInfo(),
        ]);
        setCategories(catData || []);
        setGoals(goalData || []);
        setTransactions((transData || []).map((t: any) => ({ ...t, amount: Number(t.amount) })));
        setSubInfo(info);

        const chanTopic = `public:goals_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(r => { if (!r.error) setCategories(r.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `uid=eq.${user.uid}` }, () => {
            db.from('goals').select('*').eq('uid', user.uid).then(r => { if (!r.error) setGoals(r.data || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('transactions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setTransactions((r.data || []).map((t: any) => ({ ...t, amount: Number(t.amount) }))); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'users/' + user?.uid + '/goals');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCategoryId('');
    setTargetAmount('');
    setDeadline('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !targetAmount || !auth.currentUser) return;
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      const id = editingId || uuidv4();
      const now = Date.now();
      const payload: Goal = {
        id,
        uid: user.uid,
        category_id: categoryId,
        target_amount: parseFloat(targetAmount),
        deadline: deadline ? new Date(deadline).getTime() : null,
        created_at: editingId ? undefined : now,
        updated_at: now,
      };
      const { error } = await db.from('goals').upsert([payload], { onConflict: 'id' });
      if (error) throw error;
      setGoals((prev: Goal[]) => {
        const filtered = (prev || []).filter(g => g.id !== id);
        return [...filtered, payload as Goal];
      });
      toast.success(editingId ? 'Goal updated' : 'Goal created');
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save goal');
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'users/' + auth.currentUser?.uid + '/goals');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setCategoryId(goal.category_id);
    setTargetAmount(String(goal.target_amount));
    setDeadline(goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '');
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      await db.from('goals').delete().eq('id', id).eq('uid', user.uid);
      setGoals(prev => (prev || []).filter(g => g.id !== id));
      toast.success('Goal deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      handleFirestoreError(err, OperationType.DELETE, 'users/' + auth.currentUser?.uid + '/goals/' + id);
    } finally {
      setLoading(false);
    }
  };

  const premium = subInfo && isPremium(subInfo.tier, subInfo.status);
  const goalCategories = categories.filter(c => c.type === 'goal');

  // Compute progress for each goal: sum of expense transactions for that category
  const getGoalProgress = (goal: Goal) => {
    return transactions
      .filter(t => t.category_id === goal.category_id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  const formatDeadline = (ts: number | null | undefined) => {
    if (!ts) return null;
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysUntilDeadline = (ts: number | null | undefined) => {
    if (!ts) return null;
    const diff = Math.ceil((ts - Date.now()) / 86400000);
    if (diff <= 0) return 'Overdue';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  return (
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Updating goals" />

      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex w-full flex-col justify-between sm:flex-row sm:flex-wrap">
          <PageHeader title="Goals" description="Set financial goals and track your progress." />
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
            <div className="flex items-center gap-2">
              <Button disabled={!premium && goals.length >= GOAL_LIMIT}
                onClick={() => {
                  if (!premium && goals.length >= GOAL_LIMIT) {
                    toast.error(`You've reached the free limit of ${GOAL_LIMIT} goals. Upgrade to Premium for unlimited goals.`, {
                      action: { label: 'Upgrade', onClick: () => navigate('/finance/upgrade') },
                    });
                    return;
                  }
                  setOpen(true);
                }} className={`flex items-center ${primaryButtonClass}`}>
                <Plus className="h-4 w-4 mr-2" /> Add Goal
              </Button>
              {!premium && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {goals.length} / {GOAL_LIMIT}
                </span>
              )}
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Goal' : 'New Goal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Goal Category</label>
                  <Select value={categoryId} onValueChange={v => setCategoryId(String(v))} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal category">
                        {categoryId ? getCategoryName(categoryId) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {goalCategories.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No goal categories found.{' '}
                          <button
                            type="button"
                            className="text-indigo-600 hover:underline font-medium"
                            onClick={() => navigate('/finance/categories')}
                          >
                            Create one first
                          </button>
                        </div>
                      ) : (
                        goalCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="10000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deadline (optional)</label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {editingId ? 'Update Goal' : 'Create Goal'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No goals yet</p>
          <p className="text-sm mt-1">Create a goal category first, then set your target.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const spent = getGoalProgress(goal);
            const progress = goal.target_amount > 0 ? Math.min(100, (spent / goal.target_amount) * 100) : 0;
            const isComplete = spent >= goal.target_amount;
            const isDanger = progress > 100;
            const deadlineStr = formatDeadline(goal.deadline);
            const deadlineStatus = daysUntilDeadline(goal.deadline);

            return (
              <Card key={goal.id} className={`hover:shadow-sm transition-shadow ${isComplete ? 'border-green-300 bg-gradient-to-br from-green-50 to-white' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{getCategoryName(goal.category_id)}</h3>
                      {deadlineStr && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {deadlineStr}
                          {deadlineStatus && (
                            <span className={`ml-1 ${deadlineStatus === 'Overdue' ? 'text-red-500' : 'text-amber-600'}`}>
                              ({deadlineStatus})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-bold tracking-tight">{formatCurrency(spent)}</span>
                      <span className="text-sm text-muted-foreground">of {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isDanger ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isComplete ? 'Goal reached! 🎉' : `${progress.toFixed(1)}% complete`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
