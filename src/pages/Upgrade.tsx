import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Check, Zap, ArrowRight, Shield, Crown, CreditCard, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import LoadingOverlay from '../components/ui/loading-overlay';
import { createSubscription, openRazorpayCheckout, getUserSubscriptionInfo, isPremium, fetchSubscriptionConfig, paiseToRupees, SubscriptionInfo, SubscriptionConfig } from '../lib/razorpay';
import { auth } from '../lib/firebase';

const FREE_FEATURES = [
  'Transaction tracking (unlimited)',
  'Basic dashboard & charts',
  '1 AI report per month',
  'Up to 5 budgets',
  'Up to 5 subscriptions',
  '12-month data retention',
];

const PREMIUM_FEATURES = [
  'Unlimited AI Financial Reports',
  'Advanced PDF & CSV exports',
  'Unlimited budgets & subscriptions',
  'Multi-currency & custom locale',
  'Unlimited historical data',
  'Priority support',
];

export default function Upgrade() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser || await auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const info = await getUserSubscriptionInfo();
      setSubInfo(info);
      setCheckingStatus(false);
    };
    check();
  }, [navigate]);

  // Fetch subscription pricing from server
  useEffect(() => {
    fetchSubscriptionConfig()
      .then((cfg) => {
        setConfig(cfg);
        setConfigLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch subscription config:', err);
        setConfigLoading(false);
      });
  }, []);

  const alreadyPremium = subInfo && isPremium(subInfo.tier, subInfo.status);

  const handleSubscribe = async (planId: 'premium_monthly' | 'premium_yearly') => {
    if (!auth.currentUser) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const email = user.email || '';
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      // 1. Create subscription on server
      const sub = await createSubscription(planId, email, name);

      // 2. Open Razorpay checkout
      await openRazorpayCheckout({
        key: sub.key_id,
        subscription_id: sub.subscription_id,
        name: 'TheOneDollarGold',
        description: planId === 'premium_yearly' ? 'Premium Yearly Plan' : 'Premium Monthly Plan',
        prefill: { name, email },
        callback_url: `${window.location.origin}/finance/upgrade?success=true`,
        redirect: true,
      });

      // 3. If we get here (redirect: true means we won't), refresh status
      // The callback URL will redirect back here with ?success=true
    } catch (err: any) {
      toast.error(err.message || 'Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  // Check if we returned from a successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Subscription activated! Welcome to Premium 🎉');
      // Refresh subscription info
      getUserSubscriptionInfo().then(setSubInfo);
      // Clean URL
      window.history.replaceState({}, '', '/finance/upgrade');
    }
    if (params.get('canceled') === 'true') {
      toast.info('Subscription was canceled. Feel free to try again!');
      window.history.replaceState({}, '', '/finance/upgrade');
    }
  }, []);

  if (checkingStatus || configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingOverlay show={true} label="Checking subscription status" />
      </div>
    );
  }

  // Build plan data from server config (fallback to hardcoded values if config is somehow null)
  // Prices from server are base prices in paise; apply discount percentages to get final prices
  const monthlyBasePrice = config ? paiseToRupees(config.MONTHLY_PRICE) : 599;
  const monthlyDiscountPercent = config?.MONTHLY_DISCOUNT_PERCENT ?? 0;
  const monthlyPrice = Math.round(monthlyBasePrice * (1 - monthlyDiscountPercent / 100));

  const yearlyBasePrice = config ? paiseToRupees(config.YEARLY_PRICE) : 5999;
  const yearlyDiscountPercent = config?.YEARLY_DISCOUNT_PERCENT ?? 17;
  const yearlyPrice = Math.round(yearlyBasePrice * (1 - yearlyDiscountPercent / 100));

  const yearlySavings = yearlyBasePrice - yearlyPrice;
  const monthlyEffectivePrice = Math.round(yearlyPrice / 12);

  const PLANS = [
    {
      id: 'premium_monthly' as const,
      name: 'Premium Monthly',
      price: monthlyPrice,
      currency: 'INR',
      description: 'Perfect for getting started with premium features',
      popular: false,
      features: [
        'Unlimited AI Financial Reports',
        'Advanced PDF & CSV exports',
        'Unlimited budgets & categories',
        'Multi-currency support',
        'Priority support',
        'Historical data — unlimited retention',
      ],
      cta: 'Subscribe Monthly',
    },
    {
      id: 'premium_yearly' as const,
      name: 'Premium Yearly',
      price: yearlyPrice,
      currency: 'INR',
      description: `Best value — save ${yearlyDiscountPercent}%`,
      popular: true,
      features: [
        'Everything in Monthly, plus:',
        `₹${monthlyEffectivePrice.toLocaleString('en-IN')}/mo effective — save ₹${yearlySavings.toLocaleString('en-IN')}/yr`,
        'Early access to new features',
        'Exclusive beta features',
        'Priority support with faster response',
      ],
      cta: 'Subscribe Yearly',
    },
  ];

  return (
    <div className="min-h-[80vh]">
      <LoadingOverlay show={loading} label="Processing payment..." />

      {alreadyPremium ? (
        /* ── Already Premium ── */
        <div className="mx-auto max-w-2xl space-y-8 pt-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Crown className="h-8 w-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">You're on Premium! 🎉</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              You have full access to unlimited AI reports, advanced exports, and all premium features.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" onClick={() => navigate('/finance/reports')}>
                Go to Reports <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/finance/profile')}>
                Manage Subscription <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          <Card className="p-6 text-left border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" /> Subscription Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{subInfo?.tier?.replace('_', ' ') || 'Premium'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-green-600">{subInfo?.status || 'Active'}</span>
              </div>
              {subInfo?.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renewal Date</span>
                  <span className="font-medium">{new Date(subInfo.endDate).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        /* ── Pricing Tiers ── */
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-center pt-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-xs sm:text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Go Premium
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Unlock your financial{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                superpowers
              </span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
              Get unlimited AI-powered insights, advanced reports, and full control over your financial data.
            </p>
          </motion.div>

          {/* Plan comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold shadow-lg">
                      <Zap className="h-3 w-3" /> Best Value
                    </span>
                  </div>
                )}
                <Card className={`h-full p-6 sm:p-8 border-2 transition-all duration-300 ${
                  plan.popular
                    ? 'border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 to-transparent shadow-xl shadow-indigo-500/10'
                    : 'border-border hover:border-indigo-500/20'
                }`}>
                  <div className="space-y-6">
                    {/* Plan header */}
                    <div>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      {plan.id === 'premium_yearly' ? (
                        <>
                          <span className="text-2xl line-through text-muted-foreground/50">
                            ₹{yearlyBasePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-4xl font-bold text-indigo-400">
                            ₹{plan.price.toLocaleString('en-IN')}
                          </span>
                          {yearlyDiscountPercent > 0 && (
                            <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500">
                              Save {yearlyDiscountPercent}%
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {monthlyDiscountPercent > 0 && (
                            <span className="text-2xl line-through text-muted-foreground/50">
                              ₹{monthlyBasePrice.toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-4xl font-bold">₹{plan.price.toLocaleString('en-IN')}</span>
                          {monthlyDiscountPercent > 0 && (
                            <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500">
                              Save {monthlyDiscountPercent}%
                            </span>
                          )}
                        </>
                      )}
                      <span className="text-muted-foreground text-sm">/{plan.id === 'premium_yearly' ? 'year' : 'month'}</span>
                    </div>
                    {plan.id === 'premium_yearly' && (
                      <p className="text-xs text-indigo-400 font-medium -mt-3">
                        ₹{monthlyEffectivePrice.toLocaleString('en-IN')}/month — save ₹{yearlySavings.toLocaleString('en-IN')}/year vs monthly
                      </p>
                    )}

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading}
                      className={`w-full ${
                        plan.popular
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : ''
                      }`}
                      size="lg"
                    >
                      {loading ? 'Processing...' : plan.cta}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Feature comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="pt-8"
          >
            <h2 className="text-xl font-semibold text-center mb-6">Compare Plans</h2>
            <div className="max-w-2xl mx-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium text-muted-foreground">Feature</th>
                    <th className="text-center py-3 font-medium">Free</th>
                    <th className="text-center py-3 font-medium text-indigo-600">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'AI Financial Reports', free: '1/month', premium: 'Unlimited' },
                    { feature: 'PDF / CSV Export', free: '❌', premium: '✅ Unlimited' },
                    { feature: 'Multi-currency / Locale', free: '❌', premium: '✅' },
                    { feature: 'Budgets', free: 'Up to 5', premium: 'Unlimited' },
                    { feature: 'Subscriptions', free: 'Up to 5', premium: 'Unlimited' },
                    { feature: 'Data Retention', free: '12 months', premium: 'Unlimited' },
                    { feature: 'Priority Support', free: '❌', premium: '✅' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3">{row.feature}</td>
                      <td className="text-center py-3 text-muted-foreground">{row.free}</td>
                      <td className="text-center py-3 font-medium text-indigo-600">{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Trust / Secure */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="text-center pt-4 pb-8"
          >
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Secure payments powered by Razorpay
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
