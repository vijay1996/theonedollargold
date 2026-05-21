/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
import { auth } from './lib/firebase';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from './components/ui/sonner';
import Loader from './components/ui/loader';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Subscriptions from './pages/Subscriptions';
import CreditCards from './pages/CreditCards';
import Profile from './pages/Profile';
import Assets from './pages/Assets';
import Reports from './pages/reports/Reports';

function ProtectedRoute({ user, loading }: { user: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader size={64} label="Preparing your dashboard" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u: any) => {
      setUser(u);
      setLoading(false);
    });
    // attempt to populate currentUser immediately
    auth.getUser().then((u: any) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={!loading && user ? <Navigate to="/finance/dashboard" /> : <Login />} />
          
          <Route path="/finance" element={<ProtectedRoute user={user} loading={loading} />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="assets" element={<Assets />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="cards" element={<CreditCards />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}
