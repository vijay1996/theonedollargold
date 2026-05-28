import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { useLocalization } from '../../hooks/useLocalization';
import { ReportsData } from './useReportsData';

const MILESTONES = [25, 50, 75, 100];

export function GoalsTab({ data }: { data: ReportsData }) {
  const { formatCurrency, formatDate } = useLocalization();
  const { goals, categories, transactions } = data;

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  // Build per-goal data with contributions and milestones
  const goalData = useMemo(() => goals.map(goal => {
    const catName = getCatName(goal.category_id);
    // All expense transactions for this goal's category
    const contributions = transactions
      .filter(t => t.category_id === goal.category_id && t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSpent = contributions.reduce((s, t) => s + Number(t.amount), 0);
    const progressPct = goal.target_amount > 0 ? Math.min(100, (totalSpent / goal.target_amount) * 100) : 0;

    // Determine which milestones have been passed
    const reachedMilestones = MILESTONES.filter(m => progressPct >= m);

    return {
      goal,
      catName,
      contributions,
      totalSpent,
      progressPct,
      reachedMilestones,
      isComplete: totalSpent >= goal.target_amount,
      isOver: totalSpent > goal.target_amount,
    };
  }), [goals, transactions, categories]);

  const totalMilestoneAlerts = goalData.reduce((s, g) => s + g.reachedMilestones.length, 0);

  return (
    <div className="space-y-6">
      {/* ── Milestone Alerts ── */}
      {totalMilestoneAlerts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🏆 Goal Milestones Reached</CardTitle>
            <CardDescription>Celebrating progress on your financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goalData.map(g =>
                g.reachedMilestones.map(m => {
                  const emoji = m === 100 ? '🎉' : m === 75 ? '🚀' : m === 50 ? '💪' : '🌟';
                  return (
                    <div
                      key={`${g.goal.id}-${m}`}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        m === 100
                          ? 'border-green-200 bg-green-50'
                          : 'border-indigo-200 bg-indigo-50/50'
                      }`}
                    >
                      <span className="text-xl shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {m === 100
                            ? `"${g.catName}" goal reached!`
                            : `"${g.catName}" — ${m}% completed`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(g.totalSpent)} of {formatCurrency(g.goal.target_amount)}
                          {g.goal.deadline && ` · Due ${formatDate(new Date(g.goal.deadline).toISOString())}`}
                        </p>
                      </div>
                      {m === 100 && (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Achieved
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {totalMilestoneAlerts === 0 && goalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🏆 Goal Milestones</CardTitle>
            <CardDescription>Progress milestones will appear here as you save toward your goals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              Keep contributing — milestones will light up at 25%, 50%, 75%, and 100%!
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── No goals state ── */}
      {goalData.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goal Contributions</CardTitle>
            <CardDescription>Track how your transactions add up toward each goal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              No goals set yet. Create a goal from the Goals page to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Contribution Breakdown per Goal ── */}
      {goalData.map(g => (
        <Card key={g.goal.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                  {g.catName}
                  {g.isComplete && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Complete
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Target: {formatCurrency(g.goal.target_amount)}
                  {g.goal.deadline && ` · Due ${formatDate(new Date(g.goal.deadline).toISOString())}`}
                </CardDescription>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xl font-bold ${
                  g.isOver ? 'text-red-600' : g.isComplete ? 'text-green-700' : 'text-indigo-700'
                }`}>
                  {formatCurrency(g.totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground">of {formatCurrency(g.goal.target_amount)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress bar with milestone dots */}
            <div className="relative mb-5">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    g.isOver ? 'bg-red-500' : g.isComplete ? 'bg-green-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(g.progressPct, 100)}%` }}
                />
              </div>
              {/* Milestone markers below the bar */}
              <div className="flex justify-between px-0 mt-1.5">
                {MILESTONES.map(m => (
                  <div key={m} className="flex flex-col items-center" style={{ width: 0, overflow: 'visible' }}>
                    <div
                      className={`w-2 h-2 rounded-full -mt-[18px] ${
                        g.progressPct >= m ? 'bg-indigo-500 ring-2 ring-indigo-200' : 'bg-slate-300'
                      }`}
                    />
                    <span className={`text-[10px] mt-0.5 ${
                      g.progressPct >= m ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                    }`}>
                      {m}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contributions table */}
            {g.contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transactions recorded for this goal yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-left py-2 pr-4 font-medium">Comment</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.contributions.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-2 pr-4 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="py-2 pr-4 text-muted-foreground max-w-[240px] truncate">
                          {t.comment || '—'}
                        </td>
                        <td className="py-2 text-right font-medium text-red-600 whitespace-nowrap">
                          -{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2 pr-4 font-semibold" colSpan={2}>Total Contributed</td>
                      <td className={`py-2 text-right font-bold whitespace-nowrap ${
                        g.isOver ? 'text-red-600' : g.isComplete ? 'text-green-700' : 'text-indigo-700'
                      }`}>
                        {formatCurrency(g.totalSpent)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
