import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Wallet, CreditCard, RefreshCw, Layers, PieChart, LogOut, Settings, Menu, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { AIChat } from '../AIChat';
import { useSubscriptionsProcessor } from '../../hooks/useSubscriptionsProcessor';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useSubscriptionsProcessor();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/finance/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/finance/transactions', icon: RefreshCw },
    { name: 'Budgets', path: '/finance/budgets', icon: PieChart },
    { name: 'Categories', path: '/finance/categories', icon: Layers },
    { name: 'Subscriptions', path: '/finance/subscriptions', icon: RefreshCw },
    { name: 'Credit Cards', path: '/finance/cards', icon: CreditCard },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 flex items-center gap-2 text-white font-semibold text-lg border-b border-slate-800">
        <Wallet className="h-6 w-6 text-indigo-400" />
        <span>OneDollarGold</span>
      </div>
      <nav className="flex-1 py-4 space-y-1">
        <Link 
          to="/" 
          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm mb-4"
        >
          <ExternalLink className="h-4 w-4" /> Back to Main Site
        </Link>
        <div className="px-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Finance App
        </div>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-1">
        <Link to="/finance/profile" className={`flex items-center gap-3 px-4 py-2 transition-colors font-medium ${location.pathname === '/finance/profile' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
          <Settings className="h-5 w-5" /> Profile
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 hover:text-white transition-colors w-full text-left font-medium text-red-400">
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
          <span>OneDollarGold</span>
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-slate-800 hover:text-white" />}>
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-slate-900 text-slate-300 border-r-slate-800 flex flex-col hide-close">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative w-full h-[calc(100vh-64px)] md:h-screen">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative min-h-full">
          <Outlet />
        </main>
        <AIChat />
      </div>
    </div>
  );
}
