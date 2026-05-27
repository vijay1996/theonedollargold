import React from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { Wallet, Shield, PieChart, ArrowRight, ExternalLink } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Wallet className="h-8 w-8 text-indigo-400" />
          <span className="text-xl font-bold tracking-tight">TheOneDollarGold</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Sign In</Button>
          </Link>
          <Link to="/finance/dashboard">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white border-0">
              Open Finance App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
        <div className="relative isolate">
          {/* Background decoration */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
          </div>

          <div className="mx-auto max-w-2xl lg:max-w-4xl pt-16 sm:pt-24 lg:pt-32">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-8">
                The Ecosystem for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Financial Mastery</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-400 max-w-2xl mx-auto">
                TheOneDollarGold is the premier ecosystem of tools and applications designed to help you build, track, and master your wealth. 
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link to="/finance/dashboard">
                  <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-8 flex gap-2">
                    Launch Finance App <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login" className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                  Access Dashboard <span aria-hidden="true">→</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="mt-32 mx-auto max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Finance App Card */}
            <Link to="/finance/dashboard" className="group block h-full rounded-2xl bg-slate-900 border border-slate-800 p-8 transition-all hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/10">
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <PieChart className="h-6 w-6 text-indigo-400" />
                </div>
                <ExternalLink className="h-5 w-5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                TheOneDollarGold Finance <span className="text-xs font-semibold px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full">Live</span>
              </h3>
              <p className="text-slate-400">
                Track your net worth, manage budgets, analyze spending, and monitor your subscriptions all in one powerful dashboard.
              </p>
            </Link>

            {/* Coming Soon App Card */}
            <div className="block h-full rounded-2xl bg-slate-900 border border-slate-800 border-dashed p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <span className="text-sm font-mono font-medium text-slate-300 border border-slate-700 bg-slate-900/80 px-4 py-2 rounded-full shadow-xl">
                  Coming Soon
                </span>
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 mb-6">
                <Shield className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                TheOneDollarGold Returns
              </h3>
              <p className="text-slate-500">
                A new era of investment tracking and portfolio analysis. Keep an eye on our ecosystem for future releases.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-4 opacity-50">
            <Wallet className="h-5 w-5 text-slate-400" />
            <span className="font-semibold text-slate-300">TheOneDollarGold</span>
          </div>
          <p>© {new Date().getFullYear()} The One Dollar Gold. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
