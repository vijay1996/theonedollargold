import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format, subMonths } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { Wallet, CreditCard as CCIcon, TrendingUp, TrendingDown, HandMetal, Coins, House, Car } from 'lucide-react';
import LoadingOverlay from '../components/ui/loading-overlay';
import { useLocalization } from '../hooks/useLocalization';
import { Transaction, Subscription, CreditCard, Category, Disclosure } from './reports/useReportsData';

interface UpcomingBill {
  type: 'Subscription' | 'Credit Card';
  name: string;
  amount: number | string;
  nextDate: number;
}

export default function Dashboard() {
  const { formatCurrency, formatDate } = useLocalization();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
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
        const [{ data: catData }, { data: transData }, { data: subData }, { data: ccData }, { data: discData }] = await Promise.all([
          db.from('categories').select('*').eq('uid', user.uid),
          db.from('transactions').select('*').eq('uid', user.uid),
          db.from('subscriptions').select('*').eq('uid', user.uid),
          db.from('credit_cards').select('*').eq('uid', user.uid),
          db.from('disclosures').select('*').eq('uid', user.uid)
        ]);
        setCategories(catData as Category[] || []);
        setTransactions((transData as Transaction[] || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setSubscriptions(subData as Subscription[] || []);
        setCreditCards(ccData as CreditCard[] || []);
        setDisclosures(discData as Disclosure[] || []);

        const chanTopic = `public:dashboard_${user.uid}_${Date.now()}`;
        channel = db.channel(chanTopic)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `uid=eq.${user.uid}` }, () => {
            db.from('categories').select('*').eq('uid', user.uid).then(r => { if (!r.error) setCategories(r.data as Category[] || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('transactions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setTransactions((r.data as Transaction[] || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `uid=eq.${user.uid}` }, () => {
            db.from('subscriptions').select('*').eq('uid', user.uid).then(r => { if (!r.error) setSubscriptions(r.data as Subscription[] || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards', filter: `uid=eq.${user.uid}` }, () => {
            db.from('credit_cards').select('*').eq('uid', user.uid).then(r => { if (!r.error) setCreditCards(r.data as CreditCard[] || []); });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'disclosures', filter: `uid=eq.${user.uid}` }, () => {
            db.from('disclosures').select('*').eq('uid', user.uid).then(r => { if (!r.error) setDisclosures(r.data as Disclosure[] || []); });
          }).subscribe();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "users/" + user?.uid + "/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (channel?.unsubscribe) channel.unsubscribe(); };
  }, []);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  // Group transactions by month for chart
  const monthlyData: Record<string, { name: string; income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, 'MMM yyyy');
    monthlyData[key] = { name: key, income: 0, expense: 0 };
  }

  transactions.forEach(t => {
    const d = new Date(t.date);
    const key = format(d, 'MMM yyyy');
    if (monthlyData[key]) {
      if (t.type === 'income') monthlyData[key].income += t.amount;
      else monthlyData[key].expense += t.amount;
    }
  });

  const chartData = Object.values(monthlyData);

  // Compute visible range for income/expense chart (with padding) — kept for analytics calculations
  const ieValues = chartData.flatMap(d => [Number(d.income || 0), Number(d.expense || 0)]);
  const ieMinRaw = ieValues.length ? Math.min(...ieValues) : 0;
  const ieMaxRaw = ieValues.length ? Math.max(...ieValues) : 0;
  const iePadding = Math.max((ieMaxRaw - ieMinRaw) * 0.1, 1);
  const ieDomain = [Math.min(0, ieMinRaw - iePadding), ieMaxRaw + iePadding] as [number, number];

  // Cumulative net worth (simplified: income - expense)
  // Compute cumulative net from transactions only, then shift series so final point equals current disclosures net.
  const disclosuresNet = disclosures.reduce((acc, d) => {
    const amt = Number(d.amount || 0);
    return acc + (d.type === 'liability' ? -amt : amt);
  }, 0);

  // cumulative from transactions (oldest -> newest)
  let cumulativeTrans = 0;
  const transCumulative = chartData.map(d => {
    cumulativeTrans += (d.income - d.expense);
    return { name: d.name, amount: cumulativeTrans };
  });

  const cumulativeTransLatest = transCumulative.length ? transCumulative[transCumulative.length - 1].amount : 0;
  const offset = disclosuresNet - cumulativeTransLatest; // shift so final equals disclosuresNet

  const netWorthData = transCumulative.map(d => ({ name: d.name, amount: d.amount + offset }));

  // Compute visible range for net worth chart
  const nwValues = netWorthData.map(d => Number(d.amount || 0));
  const nwMinRaw = nwValues.length ? Math.min(...nwValues) : 0;
  const nwMaxRaw = nwValues.length ? Math.max(...nwValues) : 0;
  const nwPadding = Math.max((nwMaxRaw - nwMinRaw) * 0.1, 1);
  const nwDomain = [nwMinRaw - nwPadding, nwMaxRaw + nwPadding] as [number, number];

  // Additional insights computations
  const totalAssets = disclosures.filter(d => d.type === 'asset').reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalLiabilities = disclosures.filter(d => d.type === 'liability').reduce((s, d) => s + Number(d.amount || 0), 0);

  const avgMonthlyIncome = chartData.length ? chartData.reduce((s, d) => s + Number(d.income || 0), 0) / chartData.length : 0;
  const avgMonthlyExpense = chartData.length ? chartData.reduce((s, d) => s + Number(d.expense || 0), 0) / chartData.length : 0;

  // Top expense category
  const expenseByCategory: Record<string, number> = {};
  transactions.filter(t => t.type !== 'income').forEach(t => {
    const cid = t.category_id || 'uncategorized';
    expenseByCategory[cid] = (expenseByCategory[cid] || 0) + Number(t.amount || 0);
  });
  const topExpenseCatId = Object.keys(expenseByCategory).sort((a, b) => (expenseByCategory[b] || 0) - (expenseByCategory[a] || 0))[0];
  const topExpenseCategory = topExpenseCatId ? getCategoryName(topExpenseCatId) : '—';

  const upcomingBills: UpcomingBill[] = [
    ...subscriptions.map(s => ({
      type: 'Subscription' as const,
      name: s.name,
      amount: s.amount,
      nextDate: s.deduction_date
    })),
    ...creditCards.map(c => ({
      type: 'Credit Card' as const,
      name: c.name,
      amount: 'Varies',
      nextDate: c.due_date
    }))
  ];
  
  const todayDateObj = new Date().getDate();

  const totalIncome = chartData[chartData.length - 1]?.income || 0;
  const totalExpense = chartData[chartData.length - 1]?.expense || 0;

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} label="Loading dashboard" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Your financial overview at a glance</p>
        </div>
        <div />
      </div>
      

      {/* Top summary strip */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-indigo-50 text-indigo-700"><CCIcon className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Net Worth</div><div className="wrap-break-word text-base font-bold text-indigo-700 sm:text-lg">{formatCurrency(netWorthData[netWorthData.length - 1]?.amount + totalIncome - totalExpense || 0)}</div></div></CardContent></Card>
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-green-50 text-green-600"><TrendingUp className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Income (This Month)</div><div className="wrap-break-word text-base font-bold text-green-700 sm:text-lg">{formatCurrency(totalIncome)}</div></div></CardContent></Card>
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-red-50 text-red-600"><TrendingDown className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Expenses (This Month)</div><div className="wrap-break-word text-base font-bold text-red-700 sm:text-lg">{formatCurrency(totalExpense)}</div></div></CardContent></Card>
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-indigo-50 text-indigo-700"><Wallet className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Net Savings</div><div className="wrap-break-word text-base font-bold text-indigo-700 sm:text-lg">{formatCurrency(totalIncome - totalExpense)}</div></div></CardContent></Card>
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-green-50 text-green-600"><House className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Total Assets</div><div className="wrap-break-word text-base font-bold text-green-700 sm:text-lg">{formatCurrency(totalAssets)}</div></div></CardContent></Card>
        <Card><CardContent className="flex min-w-0 items-center gap-3 p-3"><div className="shrink-0 p-2 rounded-md bg-red-50 text-red-700"><Car className="h-5 w-5"/></div><div className="min-w-0"><div className="text-xs text-muted-foreground">Total Liabilities</div><div className="wrap-break-word text-base font-bold text-red-700 sm:text-lg">{formatCurrency(totalLiabilities)}</div></div></CardContent></Card>
      </div>

      {/* Main content: left large column, right narrow column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.slice(0, 8).map(t => (
                  <div key={t.id} className="flex min-w-0 items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{getCategoryName(t.category_id || '')}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(t.date)}</div>
                    </div>
                    <div className={"shrink-0 text-right font-medium " + (t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <div className="text-sm text-muted-foreground">No recent transactions.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex min-w-0 justify-between gap-3"><span className="text-muted-foreground">Avg Monthly Income</span><span className="break-words text-right font-semibold">{formatCurrency(avgMonthlyIncome)}</span></div>
                <div className="flex min-w-0 justify-between gap-3"><span className="text-muted-foreground">Avg Monthly Expense</span><span className="break-words text-right font-semibold text-red-600">{formatCurrency(avgMonthlyExpense)}</span></div>
                <div className="flex min-w-0 justify-between gap-3"><span className="text-muted-foreground">Top Expense Category</span><span className="min-w-0 break-words text-right font-semibold">{topExpenseCategory}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bills (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {upcomingBills.slice(0,6).map((b, i) => (
                  <div key={i} className="flex min-w-0 items-center justify-between gap-3 py-1">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{b.name}</div> {/* b.name is string */}
                      <div className="text-xs text-muted-foreground">{b.type} • Day {b.nextDate}</div> {/* b.nextDate is number */}
                    </div>
                    <div className="shrink-0 text-right font-medium text-red-600">{typeof b.amount === 'number' ? formatCurrency(b.amount) : b.amount}</div>
                  </div>
                ))}
                {upcomingBills.length === 0 && <div className="text-sm text-muted-foreground">No upcoming bills.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
