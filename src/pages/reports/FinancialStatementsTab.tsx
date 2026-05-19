import { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { useLocalization } from '../../hooks/useLocalization';
import { ReportsData } from './useReportsData';

// Removed tax estimation logic

export function FinancialStatementsTab({ data }: { data: ReportsData }) {
  const { formatCurrency } = useLocalization();
  const { transactions, disclosures, subscriptions, creditCards } = data;
  const now = new Date();

  // ── Income Statement (YTD) ─────────────────────────────────────────────
  const ytd = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 1);
    return transactions.filter(t => new Date(t.date) >= start);
  }, [transactions]);

  const ytdIncome = ytd.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const ytdExpense = ytd.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  const ytdNet = ytdIncome - ytdExpense;
  
  const incomeByCategory = ytd.filter(t => t.type === 'income').reduce((acc, t) => {
    const cat = data.categories.find(c => c.id === (t.category_id || t.categoryId))?.name || 'Other';
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const allIncomes = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);

  const expenseByCategory = ytd.filter(t => t.type !== 'income').reduce((acc, t) => {
    const cat = data.categories.find(c => c.id === (t.category_id || t.categoryId))?.name || 'Other';
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const allExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  // ── Balance Sheet ──────────────────────────────────────────────────────
  const assets = disclosures.filter(d => d.type === 'asset');
  const liabilities = disclosures.filter(d => d.type === 'liability');
  const totalAssets = assets.reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalEquity = totalAssets - totalLiabilities;

  // Group by category
  const assetGroups = assets.reduce((acc: Record<string, any[]>, d) => {
    const k = d.category || 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});
  const liabGroups = liabilities.reduce((acc: Record<string, any[]>, d) => {
    const k = d.category || 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});

  // ── Expense-to-Income ──────────────────────────────────────────────────
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthlyIncome = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'income' && d >= monthStart && d <= monthEnd;
  }).reduce((s, t) => s + Number(t.amount), 0);

  const monthlyExpenseTotal = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= monthStart && d <= monthEnd;
  }).reduce((s, t) => s + Number(t.amount), 0);

  const etiRatio = monthlyIncome > 0 ? (monthlyExpenseTotal / monthlyIncome) * 100 : 0;
  const etiColor = etiRatio <= 50 ? 'text-green-700' : etiRatio <= 80 ? 'text-amber-700' : 'text-red-600';
  const etiBarColor = etiRatio <= 50 ? '#10b981' : etiRatio <= 80 ? '#f59e0b' : '#ef4444';

  // ── Investment Performance Ledger ──────────────────────────────────────
  const investments = assets.filter(d =>
    ['Investments', 'Retirement'].includes(d.category || '')
  );
  const totalInvested = investments.reduce((s, d) => s + Number(d.amount || 0), 0);
  const investedPct = totalAssets > 0 ? (totalInvested / totalAssets * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Income Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Income Statement (Year-to-Date)</CardTitle>
          <CardDescription>P&L summary for {now.getFullYear()}</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b bg-muted/20"><td colSpan={2} className="py-2 font-semibold text-muted-foreground">REVENUE</td></tr>
              {allIncomes.length === 0 && (
                <tr className="border-b"><td className="py-2 pl-4 text-muted-foreground">No income recorded</td><td className="text-right py-2 text-green-700">{formatCurrency(0)}</td></tr>
              )}
              {allIncomes.map(([cat, amt]) => (
                <tr key={cat} className="border-b"><td className="py-2 pl-4">{cat}</td><td className="text-right py-2 text-green-700">{formatCurrency(amt)}</td></tr>
              ))}
              <tr className="border-b font-semibold"><td className="py-2">Total Income</td><td className="text-right py-2 text-green-700">{formatCurrency(ytdIncome)}</td></tr>
              
              <tr className="border-b bg-muted/20"><td colSpan={2} className="py-2 font-semibold text-muted-foreground mt-2">EXPENSES</td></tr>
              {allExpenses.length === 0 && (
                <tr className="border-b"><td className="py-2 pl-4 text-muted-foreground">No expenses recorded</td><td className="text-right py-2 text-red-600">({formatCurrency(0)})</td></tr>
              )}
              {allExpenses.map(([cat, amt]) => (
                <tr key={cat} className="border-b"><td className="py-2 pl-4">{cat}</td><td className="text-right py-2 text-red-600">({formatCurrency(amt)})</td></tr>
              ))}
              <tr className="border-b font-semibold"><td className="py-2">Total Expenses</td><td className="text-right py-2 text-red-600">({formatCurrency(ytdExpense)})</td></tr>
              <tr className={`font-bold text-base ${ytdNet >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                <td className="py-3 pt-4">Net Income / (Loss)</td>
                <td className="text-right py-3 pt-4">{formatCurrency(ytdNet)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>Assets, Liabilities & Equity as of today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets column */}
            <div>
              <p className="font-semibold text-green-700 mb-2 border-b pb-1">ASSETS</p>
              {Object.entries(assetGroups).map(([cat, items]) => (
                <div key={cat} className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{cat}</p>
                  {items.map(d => (
                    <div key={d.id} className="flex justify-between text-sm py-0.5 pl-2">
                      <span>{d.name}</span><span>{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-green-700">
                <span>Total Assets</span><span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>
            {/* Liabilities + Equity column */}
            <div>
              <p className="font-semibold text-red-600 mb-2 border-b pb-1">LIABILITIES</p>
              {Object.entries(liabGroups).map(([cat, items]) => (
                <div key={cat} className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{cat}</p>
                  {items.map(d => (
                    <div key={d.id} className="flex justify-between text-sm py-0.5 pl-2">
                      <span>{d.name}</span><span>{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-red-600 mb-3">
                <span>Total Liabilities</span><span>{formatCurrency(totalLiabilities)}</span>
              </div>
              <p className="font-semibold text-indigo-700 mb-2 border-b pb-1">EQUITY</p>
              <div className="flex justify-between text-sm py-0.5 pl-2">
                <span>Retained Earnings (Net Income YTD)</span><span className={ytdNet >= 0 ? 'text-green-700' : 'text-red-600'}>{formatCurrency(ytdNet)}</span>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-indigo-700">
                <span>Total Equity</span><span>{formatCurrency(totalEquity)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense-to-Income */}
      <Card>
        <CardHeader>
          <CardTitle>Expense-to-Income Summary</CardTitle>
          <CardDescription>Monthly total expenses vs monthly income. Under 50% = healthy, 50–80% = caution, over 80% = high spend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-xs text-muted-foreground">Monthly Income</p>
              <p className="font-bold text-green-700">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-xs text-muted-foreground">Monthly Expenses</p>
              <p className="font-bold text-red-600">{formatCurrency(monthlyExpenseTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-xs text-muted-foreground">ETI Ratio</p>
              <p className={`font-bold text-xl ${etiColor}`}>{etiRatio.toFixed(1)}%</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>0%</span><span className="text-green-600">50%</span><span className="text-amber-600">80%</span><span>100%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
              <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(etiRatio, 100)}%`, background: etiBarColor }} />
              <div className="absolute top-0 h-3 w-px bg-green-500 opacity-60" style={{ left: '50%' }} />
              <div className="absolute top-0 h-3 w-px bg-amber-500 opacity-60" style={{ left: '80%' }} />
            </div>
          </div>
          {creditCards.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Credit Cards</p>
              {creditCards.map(c => (
                <div key={c.id} className="flex justify-between text-sm py-0.5">
                  <span>{c.name}</span><span className="text-muted-foreground">Due day {c.due_date || c.dueDate}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Performance Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Performance Ledger</CardTitle>
          <CardDescription>Investments & retirement assets from your disclosures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-center">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="font-bold text-indigo-700">{formatCurrency(totalInvested)}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 text-center">
              <p className="text-xs text-muted-foreground">% of Total Assets</p>
              <p className="font-bold text-indigo-700">{investedPct}%</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Investment</th>
                <th className="text-left py-2 font-medium">Category</th>
                <th className="text-right py-2 font-medium">Value</th>
                <th className="text-right py-2 font-medium">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => {
                const allocPct = totalInvested > 0 ? (Number(inv.amount) / totalInvested * 100).toFixed(1) : '0.0';
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-2 font-medium">{inv.name}</td>
                    <td className="py-2 text-muted-foreground">{inv.category}</td>
                    <td className="py-2 text-right text-indigo-700 font-semibold">{formatCurrency(inv.amount)}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${allocPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{allocPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {investments.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No investments or retirement assets in disclosures.</td></tr>
              )}
            </tbody>
          </table>
          {investments.length > 0 && (
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>Total Portfolio</span><span className="text-indigo-700">{formatCurrency(totalInvested)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
