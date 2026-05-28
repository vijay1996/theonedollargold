import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { Wallet, Shield, PieChart, ArrowRight, TrendingUp, BarChart3, Target, Bell, Sparkles, Star, Layers, RefreshCw } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: BarChart3,
      title: 'Net Worth Tracking',
      desc: 'Real-time view of your assets, liabilities, and overall net worth with historical trends.',
      color: 'from-indigo-400 to-purple-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
    },
    {
      icon: PieChart,
      title: 'Budget Management',
      desc: 'Set category budgets, track spending limits, and get alerts before you overspend.',
      color: 'from-emerald-400 to-teal-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      icon: TrendingUp,
      title: 'Income & Expense Analysis',
      desc: 'Visual breakdown of where your money comes from and where it goes every month.',
      color: 'from-amber-400 to-orange-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      icon: RefreshCw,
      title: 'Subscription Manager',
      desc: 'Keep tabs on all your recurring payments, due dates, and annual costs in one place.',
      color: 'from-rose-400 to-pink-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      iconColor: 'text-rose-400',
    },
    {
      icon: Target,
      title: 'AI-Powered Insights',
      desc: 'Get intelligent recommendations and red-flag alerts powered by advanced AI analysis.',
      color: 'from-violet-400 to-purple-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      iconColor: 'text-violet-400',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      desc: 'Never miss a bill or budget limit with proactive alerts tailored to your finances.',
      color: 'from-sky-400 to-blue-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      iconColor: 'text-sky-400',
    },
  ];

  const steps = [
    { num: '01', title: 'Connect Your Accounts', desc: 'Add your income sources, subscriptions, assets, and liabilities in minutes.' },
    { num: '02', title: 'Track Automatically', desc: 'Your financial data updates in real-time with an intuitive dashboard.' },
    { num: '03', title: 'Get AI Insights', desc: 'Receive actionable recommendations and watch your wealth grow.' },
  ];

  const stats = [
    { value: 'Real-time', label: 'Tracking' },
    { value: 'AI-Driven', label: 'Insights' },
    { value: 'Zero Config', label: 'Setup' },
    { value: '100% Free', label: 'To Use' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-x-hidden">
      {/* ── Navigation ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/70 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center border border-indigo-500/30">
                <Wallet className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              TheOneDollarGold
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs sm:text-sm px-3 sm:px-4">
                Sign In
              </Button>
            </Link>
            <Link to="/finance/dashboard">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 text-xs sm:text-sm px-3 sm:px-5">
                <span className="hidden sm:inline">Open Finance App</span>
                <span className="sm:hidden">Launch</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent blur-3xl" />
          <div className="absolute left-1/4 top-1/3 w-[400px] h-[400px] bg-gradient-to-br from-indigo-400/8 to-transparent blur-3xl" />
          <div className="absolute right-1/4 top-1/4 w-[350px] h-[350px] bg-gradient-to-bl from-purple-400/8 to-transparent blur-3xl" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-28 pb-20 sm:pb-28 lg:pb-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-medium mb-6 sm:mb-8"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Your Financial Command Center
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              The Ecosystem for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Financial Mastery
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-400 max-w-2xl mx-auto">
              Track your net worth, manage budgets, analyze spending, monitor subscriptions, and get AI-powered insights — all in one powerful ecosystem.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Link to="/finance/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300">
                  Launch Finance App <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-slate-800 bg-slate-800 hover:bg-slate-300 rounded-full px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base">
                  Sign In to Dashboard
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
                <div className="text-lg sm:text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 sm:py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs font-medium mb-4">
              <Star className="h-3 w-3 text-indigo-400" />
              Everything You Need
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Powerful features for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">financial clarity</span>
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
              Everything you need to take control of your finances in one beautiful dashboard.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="group relative p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300"
                >
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${f.bg} ${f.border} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/20 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs font-medium mb-4">
              <Layers className="h-3 w-3 text-indigo-400" />
              Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Get started in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">3 simple steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="relative text-center"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-indigo-500/40 to-purple-500/40" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 mb-5 sm:mb-6">
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{step.title}</h3>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Apps / Ecosystem ── */}
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs font-medium mb-4">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Our Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Explore our{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">growing suite</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Finance App Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
            >
              <Link to="/finance/dashboard" className="group block h-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 p-6 sm:p-8 transition-all duration-300 hover:bg-slate-800/80 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10">
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                    <PieChart className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                    Live
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  TheOneDollarGold Finance
                </h3>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  Track your net worth, manage budgets, analyze spending, and monitor your subscriptions all in one powerful dashboard.
                </p>
                <div className="mt-4 sm:mt-5 flex items-center gap-1.5 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open App <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>

            {/* Coming Soon Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="group relative h-full rounded-2xl bg-slate-900 border border-slate-800 border-dashed p-6 sm:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-medium text-slate-300 border border-slate-700 bg-slate-900/80 px-4 py-2 rounded-full shadow-xl">
                    Coming Soon
                  </span>
                </div>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 mb-5 sm:mb-6">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-300 mb-2">
                  TheOneDollarGold Returns
                </h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                  A new era of investment tracking and portfolio analysis. Keep an eye on our ecosystem for future releases.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-slate-900 to-purple-500/10 border border-indigo-500/20 p-8 sm:p-12 lg:p-16 text-center"
          >
            {/* Inner glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/8 to-purple-500/8 blur-3xl rounded-full pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 mb-5 sm:mb-6">
                <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Ready to take{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">control</span>?
              </h2>
              <p className="text-base sm:text-lg text-slate-400 max-w-lg mx-auto mb-8">
                Join TheOneDollarGold and start mastering your finances today. It's free, fast, and built for you.
              </p>
              <Link to="/finance/dashboard">
                <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-8 sm:px-10 py-3 sm:py-6 text-sm sm:text-base gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/50 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                <Wallet className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <span className="font-semibold text-slate-300 text-sm">TheOneDollarGold</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
              <Link to="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
              <Link to="/finance/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              &copy; {new Date().getFullYear()} The One Dollar Gold. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
