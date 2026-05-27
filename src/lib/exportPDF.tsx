import { pdf, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ReportsData, Transaction, Disclosure } from './../pages/reports/useReportsData';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

// ─── Colour palette ─────────────────────────────────────────────────────
const C = {
  green:     '#16a34a',
  red:       '#dc2626',
  indigo:    '#6366f1',
  amber:     '#d97706',
  slate:     '#64748b',
  lightBg:   '#f8fafc',
  border:    '#e2e8f0',
  darkText:  '#1e293b',
  mutedText: '#94a3b8',
  white:     '#ffffff',
};

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.darkText,
  },
  // Title
  titlePage: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.indigo,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 13,
    color: C.slate,
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 11,
    color: C.mutedText,
    marginTop: 8,
  },

  // Section
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: C.indigo,
    borderBottomWidth: 2,
    borderBottomColor: C.indigo,
    paddingBottom: 4,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.darkText,
    marginBottom: 6,
    marginTop: 8,
  },

  // KPI cards grid
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  kpiCard: {
    width: '30%',
    padding: 8,
    marginRight: '3%',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 7,
    color: C.slate,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  kpiSubtext: {
    fontSize: 7,
    color: C.mutedText,
    marginTop: 1,
  },

  // Progress bar
  progressBarBg: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 6,
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.lightBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeader: {
    padding: 5,
    fontSize: 7,
    fontWeight: 'bold',
    color: C.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
  },

  // Key-value lines
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  kvLabel: {
    fontSize: 8,
    color: C.slate,
  },
  kvValue: {
    fontSize: 8,
    fontWeight: 'bold',
  },

  // AI Insight card
  aiCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  aiCardRed: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
    marginBottom: 6,
    backgroundColor: '#fef2f2',
  },
  aiCardSuggest: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 4,
    marginBottom: 6,
    backgroundColor: '#eef2ff',
  },
  aiCardPos: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 4,
    marginBottom: 6,
    backgroundColor: '#f0fdf4',
  },
  aiCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiCardBody: {
    fontSize: 8,
    color: C.slate,
    lineHeight: 1.5,
  },
  aiBadge: {
    fontSize: 6,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginLeft: 4,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 7,
    color: C.slate,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginVertical: 8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: C.mutedText,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────

type FmtCurrency = (v: number) => string;
type FmtDate = (d: string | Date) => string;

function getCatName(categories: ReportsData['categories'], id?: string): string {
  if (!id) return 'Other';
  return categories.find(c => c.id === id)?.name || 'Other';
}

function getSafeCatName(categories: ReportsData['categories'], id?: string): string {
  return getCatName(categories, id);
}

// ─── PDF Document Component ─────────────────────────────────────────────

interface ReportPDFProps {
  data: ReportsData;
  rangeFrom: Date;
  rangeTo: Date;
  formatCurrency: FmtCurrency;
  formatDate: FmtDate;
  aiReport: {
    title: string;
    summary: string;
    overall_health_score: number;
    red_flags: string;
    suggestions: string;
    positives: string;
    created_at: number;
  } | null;
}

function ReportPDF({ data, rangeFrom, rangeTo, formatCurrency, formatDate, aiReport }: ReportPDFProps) {
  const { transactions, categories, budgets, subscriptions, disclosures } = data;
  const cfmt = (v: number) => formatCurrency(v);

  // ── Filtered data ─────────────────────────────────────────────────────
  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= rangeFrom && d <= rangeTo;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  const netSavingsOverall = totalIncome - totalExpense;
  const savingsRateOverall = totalIncome > 0 ? (netSavingsOverall / totalIncome) * 100 : 0;

  const rangeIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const rangeExpense = filtered.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  const rangeNet = rangeIncome - rangeExpense;

  const totalAssets = disclosures.filter(d => d.type === 'asset').reduce((s, d) => s + Number(d.current_value ?? d.amount ?? 0), 0);
  const totalLiabilities = disclosures.filter(d => d.type === 'liability').reduce((s, d) => s + Number(d.amount || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  // ── Monthly data ──────────────────────────────────────────────────────
  const months = eachMonthOfInterval({ start: rangeFrom, end: rangeTo });
  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  months.forEach(d => {
    const key = format(d, 'MMM yy');
    monthlyMap[key] = { income: 0, expense: 0 };
  });
  filtered.forEach(t => {
    const key = format(new Date(t.date), 'MMM yy');
    if (key in monthlyMap) {
      if (t.type === 'income') monthlyMap[key].income += Number(t.amount);
      else monthlyMap[key].expense += Number(t.amount);
    }
  });

  // ── Expense by category ───────────────────────────────────────────────
  const expCatMap: Record<string, number> = {};
  filtered.filter(t => t.type !== 'income').forEach(t => {
    const n = getSafeCatName(categories, t.category_id);
    expCatMap[n] = (expCatMap[n] || 0) + Number(t.amount);
  });
  const expCatPie = Object.entries(expCatMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Budget data ───────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const budgetRows = budgets.map(b => {
    const spent = transactions.filter(t => {
      if (t.category_id !== b.category_id || t.type !== 'expense') return false;
      const d = new Date(t.date);
      if (b.period === 'monthly') return d >= monthStart && d <= monthEnd;
      return d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + Number(t.amount), 0);
    const limit = Number(b.limit_amount || 0);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    return { name: getCatName(categories, b.category_id), spent, limit, pct, period: b.period };
  });

  // ── Category allocation ───────────────────────────────────────────────
  const catAlloc: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const n = getSafeCatName(categories, t.category_id);
    if (!catAlloc[n]) catAlloc[n] = { income: 0, expense: 0 };
    if (t.type === 'income') catAlloc[n].income += Number(t.amount);
    else catAlloc[n].expense += Number(t.amount);
  });
  const catMatrix = Object.entries(catAlloc)
    .map(([name, v]) => ({ name, income: v.income, expense: v.expense, total: v.income + v.expense }))
    .sort((a, b) => b.total - a.total);

  // ── Subscriptions ─────────────────────────────────────────────────────
  const monthlySubCost = subscriptions
    .filter(s => s.frequency === 'monthly')
    .reduce((s, sub) => s + Number(sub.amount || 0), 0);
  const yearlySubCost = subscriptions.reduce((s, sub) => {
    if (sub.frequency === 'monthly') return s + Number(sub.amount || 0) * 12;
    return s + Number(sub.amount || 0);
  }, 0);

  // ── YTD Financial Statements ──────────────────────────────────────────
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const ytd = transactions.filter(t => new Date(t.date) >= ytdStart);
  const ytdIncome = ytd.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const ytdExpense = ytd.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  const ytdNet = ytdIncome - ytdExpense;

  const incomeByCat: Record<string, number> = {};
  const expenseByCat: Record<string, number> = {};
  ytd.forEach(t => {
    const n = getSafeCatName(categories, t.category_id);
    if (t.type === 'income') incomeByCat[n] = (incomeByCat[n] || 0) + Number(t.amount);
    else expenseByCat[n] = (expenseByCat[n] || 0) + Number(t.amount);
  });
  const allIncomes = Object.entries(incomeByCat).sort((a, b) => b[1] - a[1]);
  const allExpenses = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);

  const assetGroups: Record<string, Disclosure[]> = {};
  const liabGroups: Record<string, Disclosure[]> = {};
  disclosures.filter(d => d.type === 'asset').forEach(d => {
    const k = d.category || 'Other';
    if (!assetGroups[k]) assetGroups[k] = [];
    assetGroups[k].push(d);
  });
  disclosures.filter(d => d.type === 'liability').forEach(d => {
    const k = d.category || 'Other';
    if (!liabGroups[k]) liabGroups[k] = [];
    liabGroups[k].push(d);
  });

  const monthlyIncome = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'income' && d >= monthStart && d <= monthEnd;
  }).reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenseTotal = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= monthStart && d <= monthEnd;
  }).reduce((s, t) => s + Number(t.amount), 0);
  const etiRatio = monthlyIncome > 0 ? (monthlyExpenseTotal / monthlyIncome) * 100 : 0;

  const investmentAssets = disclosures.filter(d =>
    d.type === 'asset' && ['Investments', 'Retirement'].includes(d.category || '')
  );
  const totalInvested = investmentAssets.reduce((s, d) => s + Number(d.current_value ?? d.amount ?? 0), 0);

  const totalSpend = catMatrix.reduce((s, c) => s + c.expense, 0);
  const equity = totalAssets - totalLiabilities;

  // ── Asset & Liability Pie data ────────────────────────────────────────
  const assetPieData = Object.entries(
    disclosures.filter(d => d.type === 'asset').reduce((acc: Record<string, number>, d) => {
      const cat = d.category || 'Other';
      acc[cat] = (acc[cat] || 0) + Number(d.current_value ?? d.amount ?? 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const liabPieData = Object.entries(
    disclosures.filter(d => d.type === 'liability').reduce((acc: Record<string, number>, d) => {
      const cat = d.category || 'Other';
      acc[cat] = (acc[cat] || 0) + Number(d.amount || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Helper to parse AI insight JSON fields
  const parseField = (field: string): { title: string; detail: string }[] => {
    try { return JSON.parse(field) || []; } catch { return []; }
  };

  return (
    <Document>
      {/* ════════════ PAGE 1: TITLE ════════════ */}
      <Page size="A4" style={styles.titlePage}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: C.indigo, marginBottom: 8 }}>
          Financial Report
        </Text>
        <Text style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>
          Comprehensive financial analysis
        </Text>
        <View style={{ width: 80, height: 3, backgroundColor: C.indigo, marginBottom: 20 }} />
        <Text style={{ fontSize: 11, color: C.mutedText, marginBottom: 4 }}>
          Period: {formatDate(rangeFrom)} – {formatDate(rangeTo)}
        </Text>
        <Text style={{ fontSize: 10, color: C.mutedText }}>
          Generated: {format(new Date(), 'MMMM d, yyyy')}
        </Text>
      </Page>

      {/* ════════════ PAGE 2-3: OVERVIEW ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Overview</Text>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>All-time Income</Text>
            <Text style={{ ...styles.kpiValue, color: C.green }}>{cfmt(totalIncome)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>All-time Expenses</Text>
            <Text style={{ ...styles.kpiValue, color: C.red }}>{cfmt(totalExpense)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Net Savings</Text>
            <Text style={{ ...styles.kpiValue, color: netSavingsOverall >= 0 ? C.green : C.red }}>{cfmt(netSavingsOverall)}</Text>
          </View>
        </View>

        {/* Savings Rate */}
        <View style={{ padding: 8, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Savings Rate</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: savingsRateOverall >= 0 ? C.indigo : C.red }}>
              {savingsRateOverall.toFixed(1)}%
            </Text>
          </View>
          <Text style={{ fontSize: 7, color: C.mutedText, marginBottom: 2 }}>
            Net savings as a % of all-time income
          </Text>
          <View style={styles.progressBarBg}>
            <View style={{ ...styles.progressBarFill, width: `${Math.max(0, Math.min(100, savingsRateOverall))}%`, backgroundColor: C.indigo }} />
          </View>
        </View>

        {/* Counts */}
        <View style={styles.kpiRow}>
          <View style={{ width: '22%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '3%' }}>
            <Text style={styles.kpiLabel}>Transactions</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{transactions.length}</Text>
          </View>
          <View style={{ width: '22%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '3%' }}>
            <Text style={styles.kpiLabel}>Subscriptions</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.amber }}>{subscriptions.length}</Text>
          </View>
          <View style={{ width: '22%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '3%' }}>
            <Text style={styles.kpiLabel}>Budgets</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.indigo }}>{budgets.length}</Text>
          </View>
          <View style={{ width: '22%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4 }}>
            <Text style={styles.kpiLabel}>Assets/Liabilities</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.green }}>{disclosures.length}</Text>
          </View>
        </View>

        {/* Period Summary */}
        <Text style={styles.subSectionTitle}>Period Summary ({formatDate(rangeFrom)} – {formatDate(rangeTo)})</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.tableHeader, width: '40%' }}>Metric</Text>
            <Text style={{ ...styles.tableHeader, width: '30%', textAlign: 'right' }}>Amount</Text>
            <Text style={{ ...styles.tableHeader, width: '30%', textAlign: 'right' }}>vs All-time %</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, width: '40%' }}>Period Income</Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right', color: C.green }}>{cfmt(rangeIncome)}</Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right' }}>
              {totalIncome > 0 ? ((rangeIncome / totalIncome) * 100).toFixed(1) : '0.0'}%
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, width: '40%' }}>Period Expenses</Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right', color: C.red }}>{cfmt(rangeExpense)}</Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right' }}>
              {totalExpense > 0 ? ((rangeExpense / totalExpense) * 100).toFixed(1) : '0.0'}%
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, width: '40%', fontWeight: 'bold' }}>Period Net</Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right', fontWeight: 'bold', color: rangeNet >= 0 ? C.green : C.red }}>
              {cfmt(rangeNet)}
            </Text>
            <Text style={{ ...styles.tableCell, width: '30%', textAlign: 'right' }}>—</Text>
          </View>
        </View>
      </Page>

      {/* ════════════ INCOME & EXPENSES ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Income &amp; Expenses</Text>

        <Text style={styles.subSectionTitle}>Monthly Cash Flow</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>Month</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Income</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Expenses</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Net</Text>
          </View>
          {Object.entries(monthlyMap).map(([month, v]) => (
            <View style={styles.tableRow} key={month}>
              <Text style={{ ...styles.tableCell, flex: 1 }}>{month}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.green }}>{cfmt(v.income)}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.red }}>{cfmt(v.expense)}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', color: (v.income - v.expense) >= 0 ? C.green : C.red }}>
                {cfmt(v.income - v.expense)}
              </Text>
            </View>
          ))}
        </View>

        {/* Cumulative data */}
        <Text style={styles.subSectionTitle}>Cumulative Totals</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>Month</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Cumul. Income</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Cumul. Expense</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Cumul. Net</Text>
          </View>
          {(() => {
            let ci = 0, ce = 0;
            return Object.entries(monthlyMap).map(([month, v]) => {
              ci += v.income;
              ce += v.expense;
              return (
                <View style={styles.tableRow} key={month}>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{month}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.green }}>{cfmt(ci)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.red }}>{cfmt(ce)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', color: (ci - ce) >= 0 ? C.green : C.red }}>
                    {cfmt(ci - ce)}
                  </Text>
                </View>
              );
            });
          })()}
        </View>

        {/* Expense by Category */}
        <Text style={styles.subSectionTitle}>Expense by Category</Text>
        {expCatPie.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Category</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Amount</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>% of Total</Text>
            </View>
            {expCatPie.map(c => {
              const pct = rangeExpense > 0 ? (c.value / rangeExpense * 100) : 0;
              return (
                <View style={styles.tableRow} key={c.name}>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{c.name}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%' }}>{cfmt(c.value)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%' }}>{pct.toFixed(1)}%</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 8 }}>No expenses in this period.</Text>
        )}
      </Page>

      {/* ════════════ ASSETS & NET WORTH ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Assets &amp; Net Worth</Text>

        {/* KPI */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Assets</Text>
            <Text style={{ ...styles.kpiValue, color: C.green }}>{cfmt(totalAssets)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Liabilities</Text>
            <Text style={{ ...styles.kpiValue, color: C.red }}>{cfmt(totalLiabilities)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Net Worth</Text>
            <Text style={{ ...styles.kpiValue, color: netWorth >= 0 ? C.green : C.red }}>{cfmt(netWorth)}</Text>
          </View>
        </View>

        {/* Asset Allocation */}
        <Text style={styles.subSectionTitle}>Asset Allocation</Text>
        {assetPieData.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Category</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Value</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>% of Assets</Text>
            </View>
            {assetPieData.map(a => (
              <View style={styles.tableRow} key={a.name}>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{a.name}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%' }}>{cfmt(a.value)}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%' }}>
                  {totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 8 }}>No assets recorded.</Text>
        )}

        {/* Liability Breakdown */}
        <Text style={styles.subSectionTitle}>Liability Breakdown</Text>
        {liabPieData.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Category</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Amount</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>% of Liabilities</Text>
            </View>
            {liabPieData.map(l => (
              <View style={styles.tableRow} key={l.name}>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{l.name}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%' }}>{cfmt(l.value)}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%' }}>
                  {totalLiabilities > 0 ? ((l.value / totalLiabilities) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 8 }}>No liabilities recorded.</Text>
        )}

        {/* Assets vs Liabilities Summary */}
        <Text style={styles.subSectionTitle}>Assets vs Liabilities Summary</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>Metric</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '30%' }}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 1 }}>Total Assets</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '30%', color: C.green }}>{cfmt(totalAssets)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 1 }}>Total Liabilities</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '30%', color: C.red }}>({cfmt(totalLiabilities)})</Text>
          </View>
          <View style={{ ...styles.tableRow, backgroundColor: totalAssets > totalLiabilities ? '#f0fdf4' : '#fef2f2' }}>
            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 'bold' }}>Net Worth</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '30%', fontWeight: 'bold', color: netWorth >= 0 ? C.green : C.red }}>
              {cfmt(netWorth)}
            </Text>
          </View>
        </View>

        {/* Monthly net worth trend */}
        <Text style={styles.subSectionTitle}>Monthly Net Worth Trend</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>Month</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Assets</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Liabilities</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Net Worth</Text>
          </View>
          {Object.entries(monthlyMap).map(([month]) => {
            const nw = totalAssets - totalLiabilities;
            return (
              <View style={styles.tableRow} key={month}>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{month}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.green }}>{cfmt(totalAssets)}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.red }}>{cfmt(totalLiabilities)}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', color: nw >= 0 ? C.green : C.red }}>{cfmt(nw)}</Text>
              </View>
            );
          })}
        </View>
      </Page>

      {/* ════════════ BUDGETS & CATEGORIES ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Budgets &amp; Categories</Text>

        {/* Budget Utilization */}
        <Text style={styles.subSectionTitle}>Budget Utilization</Text>
        {budgetRows.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            {budgetRows.map(b => {
              const barColor = b.pct >= 100 ? C.red : b.pct >= 80 ? C.amber : C.green;
              return (
                <View key={b.name} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{b.name}</Text>
                    <Text style={{ fontSize: 8, color: barColor }}>
                      {cfmt(b.spent)} / {cfmt(b.limit)} ({b.pct.toFixed(0)}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={{ ...styles.progressBarFill, width: `${b.pct}%`, backgroundColor: barColor }} />
                  </View>
                  <Text style={{ fontSize: 6.5, color: C.mutedText }}>{b.period}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 8 }}>No budgets set yet.</Text>
        )}

        {/* Budget vs Spent Table */}
        {budgetRows.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Spent vs Limit</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={{ ...styles.tableHeader, flex: 1 }}>Category</Text>
                <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '22%' }}>Spent</Text>
                <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '22%' }}>Limit</Text>
                <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>Utilization</Text>
              </View>
              {budgetRows.map(b => (
                <View style={styles.tableRow} key={b.name}>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{b.name}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '22%' }}>{cfmt(b.spent)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '22%' }}>{cfmt(b.limit)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%', color: b.pct >= 100 ? C.red : b.pct >= 80 ? C.amber : C.green }}>
                    {b.pct.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Category Allocation Matrix */}
        <Text style={styles.subSectionTitle}>Category Allocation Matrix</Text>
        {catMatrix.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Category</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '20%' }}>Income</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '20%' }}>Expense</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>% of Spend</Text>
            </View>
            {catMatrix.map(c => {
              const pct = totalSpend > 0 ? (c.expense / totalSpend * 100).toFixed(1) : '0.0';
              return (
                <View style={styles.tableRow} key={c.name}>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{c.name}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '20%', color: C.green }}>{cfmt(c.income)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '20%', color: C.red }}>{cfmt(c.expense)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%' }}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 8 }}>No transactions for category allocation.</Text>
        )}

        {/* Subscription Costs */}
        <Text style={styles.subSectionTitle}>Subscription Costs</Text>
        <View style={styles.kpiRow}>
          <View style={{ width: '45%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '5%' }}>
            <Text style={styles.kpiLabel}>Monthly Recurring</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: C.amber }}>{cfmt(monthlySubCost)}</Text>
          </View>
          <View style={{ width: '45%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4 }}>
            <Text style={styles.kpiLabel}>Annualised Total</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: C.indigo }}>{cfmt(yearlySubCost)}</Text>
          </View>
        </View>
        {subscriptions.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Name</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Frequency</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Amount</Text>
            </View>
            {subscriptions.map(s => (
              <View style={styles.tableRow} key={s.id}>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{s.name}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%' }}>{s.frequency}</Text>
                <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%' }}>{cfmt(s.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* ════════════ FINANCIAL STATEMENTS ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Financial Statements</Text>

        {/* Income Statement (YTD) */}
        <Text style={styles.subSectionTitle}>Income Statement — Year-to-Date ({now.getFullYear()})</Text>
        <View style={styles.table}>
          <View style={{ ...styles.tableHeaderRow, backgroundColor: C.lightBg }}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>REVENUE</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Amount</Text>
          </View>
          {allIncomes.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 1, color: C.mutedText }}>No income recorded</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.green }}>{cfmt(0)}</Text>
            </View>
          )}
          {allIncomes.map(([cat, amt]) => (
            <View style={styles.tableRow} key={cat}>
              <Text style={{ ...styles.tableCell, flex: 1, paddingLeft: 12 }}>{cat}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.green }}>{cfmt(amt)}</Text>
            </View>
          ))}
          <View style={{ ...styles.tableRow, backgroundColor: '#f0fdf4' }}>
            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 'bold' }}>Total Income</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', color: C.green }}>{cfmt(ytdIncome)}</Text>
          </View>
          <View style={{ ...styles.tableHeaderRow, backgroundColor: C.lightBg, marginTop: 2 }}>
            <Text style={{ ...styles.tableHeader, flex: 1 }}>EXPENSES</Text>
            <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '25%' }}>Amount</Text>
          </View>
          {allExpenses.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 1, color: C.mutedText }}>No expenses recorded</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.red }}>({cfmt(0)})</Text>
            </View>
          )}
          {allExpenses.map(([cat, amt]) => (
            <View style={styles.tableRow} key={cat}>
              <Text style={{ ...styles.tableCell, flex: 1, paddingLeft: 12 }}>{cat}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', color: C.red }}>({cfmt(amt)})</Text>
            </View>
          ))}
          <View style={{ ...styles.tableRow, backgroundColor: '#fef2f2' }}>
            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 'bold' }}>Total Expenses</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', color: C.red }}>({cfmt(ytdExpense)})</Text>
          </View>
          <View style={{ ...styles.tableRow, backgroundColor: ytdNet >= 0 ? '#eef2ff' : '#fef2f2' }}>
            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 'bold', fontSize: 9 }}>Net Income / (Loss)</Text>
            <Text style={{ ...styles.tableCell, textAlign: 'right', width: '25%', fontWeight: 'bold', fontSize: 9, color: ytdNet >= 0 ? C.indigo : C.red }}>
              {cfmt(ytdNet)}
            </Text>
          </View>
        </View>
      </Page>

      {/* ════════════ BALANCE SHEET ════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Balance Sheet</Text>
        <Text style={{ fontSize: 8, color: C.mutedText, marginBottom: 10 }}>As of {format(new Date(), 'MMMM d, yyyy')}</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Assets Column */}
          <View style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.green, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 4, marginBottom: 6 }}>ASSETS</Text>
            {Object.entries(assetGroups).length === 0 && (
              <Text style={{ fontSize: 8, color: C.mutedText }}>No assets.</Text>
            )}
            {Object.entries(assetGroups).map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7, color: C.slate, textTransform: 'uppercase', marginBottom: 2 }}>{cat}</Text>
                {items.map(d => (
                  <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4, marginBottom: 1 }}>
                    <Text style={{ fontSize: 7.5 }}>{d.name}</Text>
                    <Text style={{ fontSize: 7.5 }}>{cfmt(d.amount)}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.green }}>Total Assets</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.green }}>{cfmt(totalAssets)}</Text>
            </View>
          </View>

          {/* Liabilities + Equity Column */}
          <View style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.red, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 4, marginBottom: 6 }}>LIABILITIES</Text>
            {Object.entries(liabGroups).length === 0 && (
              <Text style={{ fontSize: 8, color: C.mutedText }}>No liabilities.</Text>
            )}
            {Object.entries(liabGroups).map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7, color: C.slate, textTransform: 'uppercase', marginBottom: 2 }}>{cat}</Text>
                {items.map(d => (
                  <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4, marginBottom: 1 }}>
                    <Text style={{ fontSize: 7.5 }}>{d.name}</Text>
                    <Text style={{ fontSize: 7.5 }}>{cfmt(d.amount)}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.red }}>Total Liabilities</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.red }}>{cfmt(totalLiabilities)}</Text>
            </View>

            <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.indigo, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 4, marginBottom: 6 }}>EQUITY</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4, marginBottom: 1 }}>
              <Text style={{ fontSize: 7.5 }}>Retained Earnings (Net Income YTD)</Text>
              <Text style={{ fontSize: 7.5, color: ytdNet >= 0 ? C.green : C.red }}>{cfmt(ytdNet)}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.indigo }}>Total Equity</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.indigo }}>{cfmt(equity)}</Text>
            </View>
          </View>
        </View>

        {/* Expense-to-Income Summary */}
        <Text style={{ ...styles.subSectionTitle, marginTop: 14 }}>Expense-to-Income Summary</Text>
        <View style={styles.kpiRow}>
          <View style={{ width: '30%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '3%' }}>
            <Text style={styles.kpiLabel}>Monthly Income</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: C.green }}>{cfmt(monthlyIncome)}</Text>
          </View>
          <View style={{ width: '30%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '3%' }}>
            <Text style={styles.kpiLabel}>Monthly Expenses</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: C.red }}>{cfmt(monthlyExpenseTotal)}</Text>
          </View>
          <View style={{ width: '30%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4 }}>
            <Text style={styles.kpiLabel}>ETI Ratio</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: etiRatio <= 50 ? C.green : etiRatio <= 80 ? C.amber : C.red }}>
              {etiRatio.toFixed(1)}%
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={{ ...styles.progressBarFill, width: `${Math.min(etiRatio, 100)}%`, backgroundColor: etiRatio <= 50 ? C.green : etiRatio <= 80 ? C.amber : C.red }} />
        </View>
        <Text style={{ fontSize: 7, color: C.mutedText, marginBottom: 8 }}>
          Under 50% = healthy, 50–80% = caution, over 80% = high spend
        </Text>

        {/* Investment Performance */}
        <Text style={styles.subSectionTitle}>Investment Performance</Text>
        <View style={styles.kpiRow}>
          <View style={{ width: '45%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: '5%' }}>
            <Text style={styles.kpiLabel}>Total Invested</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: C.indigo }}>{cfmt(totalInvested)}</Text>
          </View>
          <View style={{ width: '45%', padding: 6, borderWidth: 1, borderColor: C.border, borderRadius: 4 }}>
            <Text style={styles.kpiLabel}>% of Total Assets</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: C.indigo }}>
              {totalAssets > 0 ? ((totalInvested / totalAssets) * 100).toFixed(1) : '0.0'}%
            </Text>
          </View>
        </View>
        {investmentAssets.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={{ ...styles.tableHeader, flex: 1 }}>Investment</Text>
              <Text style={{ ...styles.tableHeader, width: '20%' }}>Category</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '20%' }}>Value</Text>
              <Text style={{ ...styles.tableHeader, textAlign: 'right', width: '15%' }}>Allocation</Text>
            </View>
            {investmentAssets.map(inv => {
              const val = Number(inv.current_value ?? inv.amount ?? 0);
              const allocPct = totalInvested > 0 ? (val / totalInvested * 100).toFixed(1) : '0.0';
              return (
                <View style={styles.tableRow} key={inv.id}>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{inv.name}</Text>
                  <Text style={{ ...styles.tableCell, width: '20%', color: C.slate }}>{inv.category}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '20%', color: C.indigo }}>{cfmt(val)}</Text>
                  <Text style={{ ...styles.tableCell, textAlign: 'right', width: '15%' }}>{allocPct}%</Text>
                </View>
              );
            })}
          </View>
        )}
      </Page>

      {/* ════════════ AI INSIGHT ════════════ */}
      {aiReport && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>AI Insight</Text>

          {/* Score Card */}
          <View style={{ ...styles.kpiRow, marginBottom: 12 }}>
            <View style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: C.border, borderRadius: 4, marginRight: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>{aiReport.title}</Text>
              <Text style={{ fontSize: 8, color: C.slate, lineHeight: 1.5 }}>{aiReport.summary}</Text>
            </View>
            <View style={{ width: 80, padding: 8, borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: aiReport.overall_health_score >= 75 ? C.green : aiReport.overall_health_score >= 50 ? C.amber : C.red }}>
                {aiReport.overall_health_score}
              </Text>
              <Text style={{ fontSize: 7, color: C.mutedText }}>Health Score</Text>
              <View style={{ width: 50, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
                <View style={{ width: `${aiReport.overall_health_score}%`, height: 4, backgroundColor: aiReport.overall_health_score >= 75 ? C.green : aiReport.overall_health_score >= 50 ? C.amber : C.red, borderRadius: 2 }} />
              </View>
            </View>
          </View>

          {/* Red Flags */}
          {(() => {
            const rfs = parseField(aiReport.red_flags);
            if (rfs.length === 0) return null;
            return (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#dc2626' }}>⚠️ Red Flags</Text>
                {rfs.map((rf, i) => (
                  <View key={i} style={styles.aiCardRed}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                      <Text style={{ ...styles.aiCardTitle, color: '#991b1b' }}>{rf.title}</Text>
                      {(rf as any).severity && (
                        <Text style={{
                          ...styles.aiBadge,
                          backgroundColor: (rf as any).severity === 'high' ? '#fca5a5' : (rf as any).severity === 'medium' ? '#fcd34d' : '#86efac',
                          color: (rf as any).severity === 'high' ? '#7f1d1d' : (rf as any).severity === 'medium' ? '#92400e' : '#166534',
                        }}>{(rf as any).severity}</Text>
                      )}
                    </View>
                    <Text style={{ ...styles.aiCardBody, color: '#7f1d1d' }}>{rf.detail}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Suggestions */}
          {(() => {
            const sgs = parseField(aiReport.suggestions);
            if (sgs.length === 0) return null;
            return (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#6366f1' }}>💡 Suggestions</Text>
                {sgs.map((sg, i) => (
                  <View key={i} style={styles.aiCardSuggest}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                      <Text style={{ ...styles.aiCardTitle, color: '#3730a3' }}>{sg.title}</Text>
                      {(sg as any).impact && (
                        <Text style={{
                          ...styles.aiBadge,
                          backgroundColor: (sg as any).impact === 'high' ? '#c4b5fd' : (sg as any).impact === 'medium' ? '#93c5fd' : '#86efac',
                          color: (sg as any).impact === 'high' ? '#5b21b6' : (sg as any).impact === 'medium' ? '#1e40af' : '#166534',
                        }}>{(sg as any).impact}</Text>
                      )}
                    </View>
                    <Text style={{ ...styles.aiCardBody, color: '#3730a3' }}>{sg.detail}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Positives */}
          {(() => {
            const pos = parseField(aiReport.positives);
            if (pos.length === 0) return null;
            return (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#16a34a' }}>✅ Positives</Text>
                {pos.map((p, i) => (
                  <View key={i} style={styles.aiCardPos}>
                    <Text style={{ ...styles.aiCardTitle, color: '#166534' }}>{p.title}</Text>
                    <Text style={{ ...styles.aiCardBody, color: '#166534' }}>{p.detail}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </Page>
      )}
    </Document>
  );
}

// ─── Exported function ──────────────────────────────────────────────────

export async function exportToPDF(
  data: ReportsData,
  rangeFrom: Date,
  rangeTo: Date,
  formatCurrency: (v: number) => string,
  formatDate: (d: string | Date) => string,
  aiReport: ReportPDFProps['aiReport'],
  filename: string,
) {
  const doc = <ReportPDF
    data={data}
    rangeFrom={rangeFrom}
    rangeTo={rangeTo}
    formatCurrency={formatCurrency}
    formatDate={formatDate}
    aiReport={aiReport}
  />;

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
