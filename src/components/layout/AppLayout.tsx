import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { auth, db } from '../../lib/firebase';
import { LayoutDashboard, Wallet, CreditCard, RefreshCw, Layers, PieChart, LogOut, Settings, Menu, ExternalLink, BarChart2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { useSubscriptionsProcessor } from '../../hooks/useSubscriptionsProcessor';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  useSubscriptionsProcessor();

  const handleLogout = async () => {
    await db.auth.signOut();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Overview',
      links: [
        { name: 'Dashboard', path: '/finance/dashboard', icon: LayoutDashboard },
        { name: 'Reports', path: '/finance/reports', icon: BarChart2 },
      ]
    },
    {
      title: 'Cash Flow',
      links: [
        { name: 'Categories', path: '/finance/categories', icon: Layers },
        { name: 'Budgets', path: '/finance/budgets', icon: PieChart },
        { name: 'Transactions', path: '/finance/transactions', icon: RefreshCw },
      ]
    },
    {
      title: 'Wealth',
      links: [
        { name: 'Assets & Liabilities', path: '/finance/assets', icon: Wallet },
      ]
    },
    {
      title: 'Commitments',
      links: [
        { name: 'Subscriptions', path: '/finance/subscriptions', icon: RefreshCw },
        { name: 'Credit Cards', path: '/finance/cards', icon: CreditCard },
      ]
    }
  ];

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-4 flex items-center gap-2 text-white font-semibold text-lg border-b border-slate-800">
        <Wallet className="h-6 w-6 text-indigo-400" />
        <Link to={"/"}><span>TheOneDollarGold</span></Link>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                        isActive ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" /> {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
      <div className="p-2 border-t border-slate-800 space-y-1">
        <Link to="/finance/profile" onClick={onNavigate} className={`flex items-center gap-3 px-4 py-2 transition-colors font-medium ${location.pathname === '/finance/profile' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
          <Settings className="h-5 w-5" /> Profile
        </Link>
        <button onClick={() => { onNavigate?.(); handleLogout(); }} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 hover:text-white transition-colors w-full text-left font-medium text-red-400">
          <LogOut className="h-5 w-5" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header & Nav */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white font-semibold text-lg">
          <Wallet className="h-6 w-6 text-indigo-400" />
          <span>TheOneDollarGold</span>
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-slate-800 hover:text-white" />}>
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-70 p-0 bg-slate-900 text-slate-300 border-r-slate-800 flex flex-col hide-close">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-scroll relative w-full h-[calc(100vh-64px)] md:h-screen">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative min-h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
