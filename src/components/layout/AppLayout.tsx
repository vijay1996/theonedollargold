import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { auth, db } from '../../lib/firebase';
import { LayoutDashboard, Wallet, CreditCard, RefreshCw, Tags, PieChart, LogOut, Settings, Menu, BarChart2, Crown, ChevronDown, Bug, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useSubscriptionsProcessor } from '../../hooks/useSubscriptionsProcessor';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({
    overview: false,
    cashflow: false,
    wealth: false,
    commitments: false,
    support: false,
  });

  const toggleMobileSection = (section: string) => {
    setMobileExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useSubscriptionsProcessor();

  const handleLogout = async () => {
    await db.auth.signOut();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Wealth',
      links: [
        { name: 'Assets & Liabilities', path: '/finance/assets', icon: Wallet },
        { name: 'Goals', path: '/finance/goals', icon: Target },
      ]
    },
    {
      title: 'Commitments',
      links: [
        { name: 'Subscriptions', path: '/finance/subscriptions', icon: RefreshCw },
        { name: 'Credit Cards', path: '/finance/cards', icon: CreditCard },
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Raise a Ticket', path: '/finance/tickets', icon: Bug },
      ]
    },
  ];

  const closeMobileNav = () => setMobileNavOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left: Logo + Desktop Nav Dropdowns */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-white font-semibold text-lg shrink-0">
              <Wallet className="h-6 w-6 text-indigo-400" />
              <span className="hidden sm:inline">TheOneDollarGold</span>
            </Link>

            {/* Desktop: Nav Group Dropdowns */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Overview dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                  Overview
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate('/finance/dashboard')}
                    className={isActive('/finance/dashboard') ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2 shrink-0" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/finance/reports')}
                    className={isActive('/finance/reports') ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                  >
                    <BarChart2 className="h-4 w-4 mr-2 shrink-0" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Standalone Categories */}
              <button
                onClick={() => navigate('/finance/categories')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/finance/categories')
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Tags className="h-4 w-4" />
                Categories
              </button>

              {/* Cash Flow dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                  Cash Flow
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate('/finance/budgets')}
                    className={isActive('/finance/budgets') ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                  >
                    <PieChart className="h-4 w-4 mr-2 shrink-0" />
                    Budgets
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/finance/transactions')}
                    className={isActive('/finance/transactions') ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                  >
                    <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
                    Transactions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {navGroups.map((group) => (
                <DropdownMenu key={group.title}>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                    {group.title}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {group.links.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem
                          key={link.name}
                          onClick={() => navigate(link.path)}
                          className={isActive(link.path) ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                        >
                          <Icon className="h-4 w-4 mr-2 shrink-0" />
                          {link.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              {/* Upgrade standalone nav item */}
              <button
                onClick={() => navigate('/finance/upgrade')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/finance/upgrade')
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                }`}
              >
                <Crown className="h-4 w-4" />
                Upgrade
              </button>
            </nav>
          </div>

          {/* Right: Profile & Logout (desktop) + Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {/* Desktop: Profile & Logout */}
            <div className="hidden md:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                  <Settings className="h-4 w-4" />
                  Profile
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => navigate('/finance/profile')}
                    className={isActive('/finance/profile') ? 'bg-indigo-500/10 text-indigo-400 font-medium' : ''}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: Hamburger */}
            <div className="md:hidden">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-slate-800 hover:text-white" />}>
                  <Menu className="h-6 w-6" />
                </SheetTrigger>
                <SheetContent side="left" className="w-70 p-0 bg-slate-900 text-slate-300 border-r-slate-800 flex flex-col hide-close">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  {/* Mobile Nav Header */}
                  <div className="p-4 flex items-center gap-2 text-white font-semibold text-lg">
                    <Wallet className="h-6 w-6 text-indigo-400" />
                    <Link to="/" onClick={closeMobileNav}><span>TheOneDollarGold</span></Link>
                  </div>
                  {/* Mobile Nav Links */}
                  <nav className="flex-1 py-4 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Upgrade standalone item */}
                      <div className="px-4">
                        <button
                          onClick={() => { closeMobileNav(); navigate('/finance/upgrade'); }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm rounded-lg ${
                            isActive('/finance/upgrade')
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 border border-indigo-500/20'
                          }`}
                        >
                          <Crown className="h-5 w-5 shrink-0" />
                          <span className="font-semibold">Upgrade</span>
                        </button>
                      </div>
                      {/* Standalone Categories */}
                      <div className="px-4">
                        <button
                          onClick={() => { closeMobileNav(); navigate('/finance/categories'); }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm rounded-lg ${
                            isActive('/finance/categories')
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 border border-indigo-500/20'
                          }`}
                        >
                          <Tags className="h-5 w-5 shrink-0" />
                          <span className="font-semibold">Categories</span>
                        </button>
                      </div>
                      {/* Overview dropdown */}
                      <div className="px-4">
                        <button
                          onClick={() => toggleMobileSection('overview')}
                          className="flex items-center justify-between w-full mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                        >
                          Overview
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileExpanded.overview ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileExpanded.overview && (
                          <div className="space-y-1">
                            <button
                              onClick={() => { closeMobileNav(); navigate('/finance/dashboard'); }}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm ${
                                isActive('/finance/dashboard')
                                  ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <LayoutDashboard className="h-5 w-5 shrink-0" /> Dashboard
                            </button>
                            <button
                              onClick={() => { closeMobileNav(); navigate('/finance/reports'); }}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm ${
                                isActive('/finance/reports')
                                  ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <BarChart2 className="h-5 w-5 shrink-0" /> Reports
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Cash Flow dropdown */}
                      <div className="px-4">
                        <button
                          onClick={() => toggleMobileSection('cashflow')}
                          className="flex items-center justify-between w-full mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                        >
                          Cash Flow
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileExpanded.cashflow ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileExpanded.cashflow && (
                          <div className="space-y-1">
                            <button
                              onClick={() => { closeMobileNav(); navigate('/finance/budgets'); }}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm ${
                                isActive('/finance/budgets')
                                  ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <PieChart className="h-5 w-5 shrink-0" /> Budgets
                            </button>
                            <button
                              onClick={() => { closeMobileNav(); navigate('/finance/transactions'); }}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm ${
                                isActive('/finance/transactions')
                                  ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <RefreshCw className="h-5 w-5 shrink-0" /> Transactions
                            </button>
                          </div>
                        )}
                      </div>
                      {navGroups.map((group) => {
                        const sectionKey = group.title.toLowerCase();
                        return (
                          <div key={group.title} className="px-4">
                            <button
                              onClick={() => toggleMobileSection(sectionKey)}
                              className="flex items-center justify-between w-full mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                            >
                              {group.title}
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileExpanded[sectionKey] ? 'rotate-180' : ''}`} />
                            </button>
                            {mobileExpanded[sectionKey] && (
                              <div className="space-y-1">
                                {group.links.map((link) => {
                                  const Icon = link.icon;
                                  return (
                                    <button
                                      key={link.name}
                                      onClick={() => { closeMobileNav(); navigate(link.path); }}
                                      className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-left text-sm ${
                                        isActive(link.path)
                                          ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500'
                                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                      }`}
                                    >
                                      <Icon className="h-5 w-5 shrink-0" /> {link.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </nav>
                  {/* Mobile Footer: Profile & Logout */}
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { closeMobileNav(); navigate('/finance/profile'); }}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors font-medium text-sm text-left ${
                        isActive('/finance/profile') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Settings className="h-5 w-5 shrink-0" /> Profile
                    </button>
                    <button
                      onClick={() => { closeMobileNav(); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-800 transition-colors font-medium text-sm text-left text-red-400"
                    >
                      <LogOut className="h-5 w-5 shrink-0" /> Log out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative min-h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
