import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { format, subMonths } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import { exportToCSV } from '../lib/exportCSV';
import { Download } from 'lucide-react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const catRef = collection(db, 'users', uid, 'categories');
    const unsubCat = onSnapshot(catRef, (snap) => setCategories(snap.docs.map(d => d.data())));

    const transRef = collection(db, 'users', uid, 'transactions');
    const unsubTrans = onSnapshot(transRef, (snap) => setTransactions(snap.docs.map(d => d.data()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())));

    const subRef = collection(db, 'users', uid, 'subscriptions');
    const unsubSub = onSnapshot(subRef, (snap) => setSubscriptions(snap.docs.map(d => d.data())));

    const ccRef = collection(db, 'users', uid, 'creditCards');
    const unsubCC = onSnapshot(ccRef, (snap) => setCreditCards(snap.docs.map(d => d.data())));

    return () => { unsubCat(); unsubTrans(); unsubSub(); unsubCC(); };
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

  // Cumulative net worth (simplified: income - expense)
  let cumulative = 0;
  const netWorthData = chartData.map(d => {
    cumulative += (d.income - d.expense);
    return { name: d.name, amount: cumulative };
  });

  const upcomingBills = subscriptions.map(s => ({ type: 'Subscription', name: s.name, amount: s.amount, nextDate: s.deductionDate })).concat(
    creditCards.map(c => ({ type: 'Credit Card', name: c.name, amount: 'Varies', nextDate: c.dueDate }))
  );
  
  const todayDateObj = new Date().getDate();

  const totalIncome = chartData[chartData.length - 1]?.income || 0;
  const totalExpense = chartData[chartData.length - 1]?.expense || 0;

  const handleExport = () => {
    const data = transactions.map(t => ({
      Date: format(new Date(t.date), 'MM/dd/yyyy'),
      Category: getCategoryName(t.categoryId),
      Type: t.type,
      Amount: t.amount,
      Comment: t.comment
    }));
    exportToCSV(data, 'transactions.csv');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2"/> Export Data</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month's Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month's Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalIncome - totalExpense).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses (6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => "$" + value} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => "$" + value} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{getCategoryName(t.categoryId)}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</div>
                  </div>
                  <div className={"font-medium " + (t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <div className="text-sm text-muted-foreground">No recent transactions.</div>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bills (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBills.map((b, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.type} (Due: Day {b.nextDate} each month)</div>
                  </div>
                  <div className="font-medium text-red-600">
                    {typeof b.amount === 'number' ? "$" + b.amount.toFixed(2) : b.amount}
                  </div>
                </div>
              ))}
              {upcomingBills.length === 0 && <div className="text-sm text-muted-foreground">No upcoming bills.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
