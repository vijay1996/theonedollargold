import { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { useLocalization } from '../../hooks/useLocalization';
import { ReportsData } from './useReportsData';

export function BudgetsTab({ data }: { data: ReportsData }) {
  const { formatCurrency } = useLocalization();
  const { transactions, categories, budgets, subscriptions } = data;

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Budget utilization with spent/remaining
  const budgetRows = useMemo(() => budgets.map(b => {
    const spent = transactions.filter(t => {
      const cid = t.category_id || t.categoryId;
      const bid = b.category_id || b.categoryId;
      if (cid !== bid || t.type !== 'expense') return false;
      const d = new Date(t.date);
      if (b.period === 'monthly') return d >= monthStart && d <= monthEnd;
      return d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + Number(t.amount), 0);
    const limit = Number(b.limit_amount || 0);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const remaining = Math.max(0, limit - spent);
    return { name: getCatName(b.category_id || b.categoryId), spent, limit, pct, remaining, period: b.period };
  }), [budgets, transactions]);

  // Category allocation matrix
  const catMatrix = useMemo(() => {
    const expenseByCategory: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const name = getCatName(t.category_id || t.categoryId);
      if (!expenseByCategory[name]) expenseByCategory[name] = { income: 0, expense: 0 };
      if (t.type === 'income') expenseByCategory[name].income += Number(t.amount);
      else expenseByCategory[name].expense += Number(t.amount);
    });
    return Object.entries(expenseByCategory)
      .map(([name, v]) => ({ name, ...v, total: v.income + v.expense }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  // Subscription cost breakdown
  const monthlySubCost = subscriptions
    .filter(s => s.frequency === 'monthly')
    .reduce((s, sub) => s + Number(sub.amount || 0), 0);
  const yearlySubCost = subscriptions.reduce((s, sub) => {
    if (sub.frequency === 'monthly') return s + Number(sub.amount || 0) * 12;
    return s + Number(sub.amount || 0);
  }, 0);

  const barColor = (pct: number) => pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-6">
      {/* Budget Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
          <CardDescription>Current period spend vs limit — progress bars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetRows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No budgets set yet.</p>}
          {budgetRows.map(b => (
            <div key={b.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{b.name}</span>
                <span className={b.pct >= 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.limit)} ({b.pct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${b.pct}%`, background: barColor(b.pct) }} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{b.pct < 100 ? `${formatCurrency(b.remaining)} remaining` : 'Over budget!'} · {b.period}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Budget Bar Chart */}
      {budgetRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spent vs Limit (Bar)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgetRows} layout="vertical" margin={{ top: 4, right: 16, left: 80, bottom: 0 }}>
                <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => formatCurrency(Number(v))} />
                <Bar dataKey="spent" name="Spent" radius={[0,4,4,0]}>
                  {budgetRows.map((b, i) => <Cell key={i} fill={barColor(b.pct)} />)}
                </Bar>
                <Bar dataKey="limit" name="Limit" fill="#e2e8f0" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Allocation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Category Allocation Matrix</CardTitle>
          <CardDescription>All-time income and expense per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Category</th>
                  <th className="text-right py-2 pr-4 font-medium">Income</th>
                  <th className="text-right py-2 pr-4 font-medium">Expense</th>
                  <th className="text-right py-2 font-medium">% of Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {catMatrix.map(r => {
                  const totalSpend = catMatrix.reduce((s, c) => s + c.expense, 0);
                  const pct = totalSpend > 0 ? (r.expense / totalSpend * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={r.name} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2 pr-4 font-medium">{r.name}</td>
                      <td className="py-2 pr-4 text-right text-green-700">{formatCurrency(r.income)}</td>
                      <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(r.expense)}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {catMatrix.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No transactions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Cost Overview</CardTitle>
          <CardDescription>Monthly and annualised recurring costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-amber-50 text-center">
              <p className="text-xs text-muted-foreground">Monthly Recurring</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(monthlySubCost)}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 text-center">
              <p className="text-xs text-muted-foreground">Annualised Total</p>
              <p className="text-lg font-bold text-indigo-700">{formatCurrency(yearlySubCost)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {subscriptions.map(s => (
              <div key={s.id} className="flex justify-between text-sm border-b last:border-0 py-1.5">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.frequency} · <span className="font-semibold text-foreground">{formatCurrency(s.amount)}</span></span>
              </div>
            ))}
            {subscriptions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No subscriptions.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
