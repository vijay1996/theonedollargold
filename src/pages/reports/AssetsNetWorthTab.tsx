import { useMemo } from 'react';
import { format, eachMonthOfInterval } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine, ComposedChart } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { useLocalization } from '../../hooks/useLocalization';
import { ReportsData } from './useReportsData';

const COLORS = ['#10b981','#6366f1','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];

export function AssetsNetWorthTab({ data, from, to }: { data: ReportsData; from: Date; to: Date }) {
  const { formatCurrency } = useLocalization();
  const { transactions, disclosures } = data;

  const totalAssets = disclosures.filter(d => d.type === 'asset').reduce((s, d) => s + Number(d.current_value ?? d.amount ?? 0), 0);
  const totalIncome = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d >= from && d <= to && t.type === 'income';
    })
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d >= from && d <= to && t.type === 'expense';
    })
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSavings = totalIncome - totalExpense;
  const totalLiabilities = disclosures.filter(d => d.type === 'liability').reduce((s, d) => s + Number(d.amount || 0), 0);
  const netWorth = totalAssets - totalLiabilities + totalSavings;

  // Asset category breakdown pie
  const assetPie = useMemo(() => {
    const map: Record<string, number> = {};
    disclosures.filter(d => d.type === 'asset').forEach(d => {
      const cat = d.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(d.current_value ?? d.amount ?? 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [disclosures]);

  // Liability breakdown
  const liabPie = useMemo(() => {
    const map: Record<string, number> = {};
    disclosures.filter(d => d.type === 'liability').forEach(d => {
      const cat = d.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(d.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [disclosures]);

  // Net worth trend (cumulative transactions offset to disclosures net)
  const netWorthTrend = useMemo(() => {
    const monthlyNet: Record<string, number> = {};
    const monthsInterval = eachMonthOfInterval({ start: from, end: to });
    monthsInterval.forEach(d => {
      const key = format(d, 'MMM yy');
      monthlyNet[key] = 0;
    });
    transactions.forEach(t => {
      const key = format(new Date(t.date), 'MMM yy');
      if (key in monthlyNet) {
        monthlyNet[key] += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      }
    });
    let running = 0;
    const months = Object.entries(monthlyNet);
    const latest = months.reduce((s, [, v]) => s + v, 0);
    const hasAnyAssetsOrLiabilities = disclosures.length > 0;
    return months.map(([name, v]) => {
      running += v;
      const netWorthValue = running;
      const assets = netWorthValue + totalAssets; // assets = netWorth + liabilities
      const liabilities = totalLiabilities;
      return { name, netWorth: assets - liabilities, assets, liabilities };
    });
  }, [transactions, netWorth, from, to, disclosures.length, totalLiabilities]);

  // Assets vs Liabilities bar
  const balanceBarData = [
    { name: 'Assets', value: totalAssets, fill: '#10b981' },
    { name: 'Liabilities', value: -totalLiabilities, fill: '#ef4444' },
    { name: 'Net Worth', value: netWorth, fill: netWorth >= 0 ? '#6366f1' : '#ef4444' },
  ];

  const cfmt = (v: number) => formatCurrency(v);
  const cfmtAbs = (v: number) => formatCurrency(Math.abs(v));
  
  const isNetWorthPositive = netWorth >= 0;
  const nwColor = isNetWorthPositive ? '#6366f1' : '#ef4444';
  const stepColor = isNetWorthPositive ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Net Worth KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-xl font-bold text-green-700">{cfmt(totalAssets)}</p></CardContent></Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Savings</p>
            <p className={`text-xl font-bold ${totalSavings >= 0 ? 'text-green-700' : 'text-red-600'}`}>{cfmt(totalSavings)}</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Liabilities</p><p className="text-xl font-bold text-red-600">{cfmt(totalLiabilities)}</p></CardContent></Card>
      </div>
      <Card className={netWorth > 0 ? 'bg-green-200' : 'bg-red-200'}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Net Worth</p><p className={`text-xl font-bold ${netWorth >= 0 ? 'text-green-900' : 'text-red-900'}`}>{cfmt(netWorth)}</p></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent>
            {assetPie.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={assetPie} cx="50%" cy="50%" innerRadius={35} outerRadius={72} paddingAngle={2} dataKey="value">
                      {assetPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => cfmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {assetPie.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[assetPie.findIndex(p => p.name === name) % COLORS.length] }} />
                      <span className="text-sm font-medium">{name}</span>
                      <span className="ml-auto font-medium">{cfmt(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (<p className="text-center text-muted-foreground">No assets found.</p>) }
          </CardContent>
        </Card>

        {/* Liability Pie */}
        <Card>
          <CardHeader><CardTitle>Liability Breakdown</CardTitle><CardDescription>By category</CardDescription></CardHeader>
          <CardContent>
            {liabPie.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={liabPie} cx="50%" cy="50%" innerRadius={35} outerRadius={72} paddingAngle={2} dataKey="value">
                      {liabPie.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#ec4899','#8b5cf6'][i % 5]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => cfmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 min-w-0">
                  {liabPie.map((c, i) => (
                    <div key={c.name} className="flex justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: ['#ef4444','#f97316','#f59e0b','#ec4899','#8b5cf6'][i % 5] }} />
                        <span className="truncate text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-medium shrink-0">{cfmt(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground py-6 text-center">No liabilities recorded.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Assets vs Liabilities Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Assets vs Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={netWorthTrend}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={cfmtAbs} />
                <Tooltip formatter={(v) => cfmt(Number(v))} />
                <Line type="monotone" dataKey="liabilities" stroke="#ef4444" name="Liabilities" dot={true} />
                <Line type="monotone" dataKey="assets" stroke="#10b981" name="Assets" dot={true} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Net Worth Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={netWorthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={cfmtAbs} />
                <Tooltip formatter={(v) => cfmt(Number(v))} />
                <Line type="monotone" dataKey="netWorth" dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
