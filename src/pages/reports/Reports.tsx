import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Download, TrendingUp, Wallet, PieChart, BarChart2, FileText, Binoculars, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '../../components/ui/button';
import { DateRangePicker } from '../../components/ui/date-range-picker';
import LoadingOverlay from '../../components/ui/loading-overlay';
import { exportToPDF } from '../../lib/exportPDF';
import { auth, db } from '../../lib/firebase';
import { useLocalization } from '../../hooks/useLocalization';
import { useReportsData } from './useReportsData';
import { getUserSubscriptionInfo, isPremium } from '../../lib/razorpay';
import type { SubscriptionInfo } from '../../lib/razorpay';
import { IncomeExpenseTab } from './IncomeExpenseTab';
import { AssetsNetWorthTab } from './AssetsNetWorthTab';
import { BudgetsTab } from './BudgetsTab';
import { FinancialStatementsTab } from './FinancialStatementsTab';
import AiInsight from './AiInsight';

const TABS = [
  { id: 'income', label: 'Income & Expenses', icon: TrendingUp },
  { id: 'assets', label: 'Assets & Net Worth', icon: Wallet },
  { id: 'budgets', label: 'Budgets & Categories', icon: PieChart },
  { id: 'statements', label: 'Financial Statements', icon: FileText },
  { id: 'ai', label: 'AI Insights', icon: Binoculars },
];

// Default: last 6 months
const defaultRange: DateRange = {
  from: startOfMonth(subMonths(new Date(), 5)),
  to: endOfMonth(new Date()),
};

export default function Reports() {
  const { formatCurrency, formatDate } = useLocalization();
  const data = useReportsData();
  const [tab, setTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [ aiInsightKey, setAiInsightKey ] = useState(0); // Used to force re-rendering of AI Insight tab when date range changes
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    getUserSubscriptionInfo().then(setSubInfo);
  }, []);

  const premium = subInfo && isPremium(subInfo.tier, subInfo.status);

  // Derive a numeric months-like range string for child tabs that need it
  // We pass the actual Date objects to child tabs instead
  const rangeFrom = dateRange?.from ?? defaultRange.from!;
  const rangeTo = dateRange?.to ?? defaultRange.to!;

  const handleExport = async () => {
    // Fetch the first (most recent) AI insight report, if available
    let aiReport = null;
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const { data: aiData } = await db
          .from('ai_insight')
          .select('*')
          .eq('uid', uid)
          .order('created_at', { ascending: false })
          .limit(1);
        if (aiData && aiData.length > 0) {
          aiReport = aiData[0] as {
            title: string;
            summary: string;
            overall_health_score: number;
            red_flags: string;
            suggestions: string;
            positives: string;
            created_at: number;
          };
        }
      }
    } catch {
      // AI report is optional; continue even if fetch fails
    }

    await exportToPDF(
      data,
      rangeFrom,
      rangeTo,
      formatCurrency,
      formatDate,
      aiReport,
      `financial_report_${formatDate(rangeFrom)}_to_${formatDate(rangeTo)}.pdf`,
    );
  };

  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = data.transactions.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  const netWorth = data.disclosures.reduce((s, d) => d.type === 'asset' ? s + Number(d.amount) : s - Number(d.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <LoadingOverlay show={data.loading} label="Loading reports" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive financial analytics across all your data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {premium ? (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          ) : (
            <Link to="/finance/upgrade">
              <Button variant="outline" className="relative overflow-hidden border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                <Crown className="h-4 w-4 mr-2 text-indigo-400" /> Export
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> Overview
        </button>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[
              { label: 'All-time Income', value: totalIncome, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
              { label: 'All-time Expenses', value: totalExpense, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
              { label: 'Net Savings', value: savings, color: savings >= 0 ? 'text-indigo-700' : 'text-red-600', bg: savings >= 0 ? 'bg-indigo-50' : 'bg-red-50', border: savings >= 0 ? 'border-indigo-200' : 'border-red-200' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-5`}>
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color} break-words`}>{formatCurrency(k.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Transactions', value: data.transactions.length, suffix: 'total', color: 'text-foreground' },
              { label: 'Active Subscriptions', value: data.subscriptions.length, suffix: 'recurring', color: 'text-amber-700' },
              { label: 'Budget Categories', value: data.budgets.length, suffix: 'set', color: 'text-indigo-700' },
              { label: 'Assets & Liabilities', value: data.disclosures.length, suffix: 'disclosed', color: 'text-green-700' },
            ].map(k => (
              <div key={k.label} className="border rounded-xl p-5 bg-card">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.suffix}</p>
              </div>
            ))}
          </div>

          <div className="border rounded-xl p-5 bg-card">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-semibold">Savings Rate</p>
                <p className="text-xs text-muted-foreground">Net savings as a % of all-time income</p>
              </div>
              <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'income'     && <IncomeExpenseTab data={data} from={rangeFrom} to={rangeTo} />}
      {tab === 'assets'     && <AssetsNetWorthTab data={data} from={rangeFrom} to={rangeTo} />}
      {tab === 'budgets'    && <BudgetsTab data={data} />}
      {tab === 'statements' && <FinancialStatementsTab data={data} />}
      {tab === 'ai' && <AiInsight key={aiInsightKey} refresh={() => setAiInsightKey(aiInsightKey + 1)} />}

      {/* Premium upsell banner for free users */}
      {!premium && tab !== 'ai' && (
        <Link to="/finance/upgrade" className="block no-underline">
          <div className="group cursor-pointer rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-transparent p-4 transition-all duration-300 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                  <Crown className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-700">Upgrade to Premium</p>
                  <p className="text-xs text-muted-foreground">Unlock AI insights, unlimited exports, and more</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                View Plans <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
