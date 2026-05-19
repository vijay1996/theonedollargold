import { useMemo } from 'react';
import { format, eachMonthOfInterval } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { useLocalization } from '../../hooks/useLocalization';
import { ReportsData } from './useReportsData';

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];

export function IncomeExpenseTab({ data, from, to }: { data: ReportsData; from: Date; to: Date }) {
  const { formatCurrency } = useLocalization();
  const { transactions, categories } = data;

  const filtered = useMemo(() => data.transactions.filter(t => {
    const d = new Date(t.date);
    return d >= from && d <= to;
  }), [data.transactions, from, to]);

  const getCatName = (id: string) => data.categories.find(c => c.id === id)?.name || 'Other';

  // Monthly stacked bar data — build from the actual date range
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: from, end: to });
    const map: Record<string, any> = {};
    months.forEach(d => { const key = format(d, 'MMM yy'); map[key] = { name: key, income: 0, expense: 0, net: 0 }; });
    filtered.forEach(t => {
      const key = format(new Date(t.date), 'MMM yy');
      if (!map[key]) return;
      if (t.type === 'income') map[key].income += Number(t.amount);
      else map[key].expense += Number(t.amount);
    });
    return Object.values(map).map((m: any) => ({ ...m, net: m.income - m.expense }));
  }, [filtered, from, to]);

  // Cumulative area chart
  const cumulativeData = useMemo(() => {
    let ci = 0, ce = 0;
    return monthlyData.map(m => {
      ci += m.income; ce += m.expense;
      return { name: m.name, income: ci, expense: ce };
    });
  }, [monthlyData]);

  // Expense by category pie
  const catPie = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(t => t.type !== 'income').forEach(t => {
      const n = getCatName(t.category_id || t.categoryId);
      map[n] = (map[n] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered, categories]);

  // Waterfall chart (net per month, colored)
  const waterfallData = useMemo(() => {
    let running = 0;
    return monthlyData.map(m => {
      const base = running < 0 ? running : 0;
      const prev = running;
      running += m.net;
      return { name: m.name, base: Math.min(prev, running), value: Math.abs(m.net), net: m.net, fill: m.net >= 0 ? '#10b981' : '#ef4444' };
    });
  }, [monthlyData]);

  const cfmt = (v: number) => formatCurrency(v);

  return (
    <div className="space-y-6">
      {/* Stacked Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stacked Monthly Cash Flow</CardTitle>
          <CardDescription>Income and expenses stacked per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={cfmt} tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={cfmt} />
              <Legend />
              <Bar dataKey="income" name="Income" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="expense" name="Expense" stackId="b" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Income vs Expense</CardTitle>
            <CardDescription>Running totals over the period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cumulativeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={cfmt} tick={{ fontSize: 10 }} width={72} />
                <Tooltip formatter={cfmt} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#gi)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#ge)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
            <CardDescription>Spending breakdown (donut)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={catPie} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
                    {catPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={cfmt} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1 min-w-0">
                {catPie.slice(0, 8).map((c, i) => (
                  <div key={c.name} className="flex justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate text-muted-foreground">{c.name}</span>
                    </div>
                    <span className="font-medium shrink-0">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Net Cash Flow (Waterfall)</CardTitle>
          <CardDescription>Green = positive month, Red = negative month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterfallData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={cfmt} tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={(v, n, p) => [cfmt(p.payload.net), 'Net']} />
              <Bar dataKey="base" stackId="w" fill="transparent" legendType="none" />
              {waterfallData.map((entry, i) => (
                <Bar key={i} dataKey="value" stackId="w" fill={entry.fill} radius={[4,4,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Line chart - net savings trend */}
      <Card>
        <CardHeader>
          <CardTitle>Net Savings Line</CardTitle>
          <CardDescription>Monthly net (income − expense)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={cfmt} tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={cfmt} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
