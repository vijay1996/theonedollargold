import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import LoadingOverlay from '../components/ui/loading-overlay';
import { hasStoredLocalization, isDefaultLocalization, localeForCurrency, readStoredLocalization, storeLocalization, LocalizationPrefs } from '../lib/localization';
import { UserProfile } from './reports/useReportsData';
import { getUserSubscriptionInfo, isPremium, SubscriptionInfo, cancelSubscription, getTierLabel } from '../lib/razorpay';
import { Crown, Shield, Sparkles, ArrowRight } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const storedPrefs = readStoredLocalization();
    setCurrency(storedPrefs.currency);
    setDateFormat(storedPrefs.dateFormat);

    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await db.from('users').select('*').eq('uid', user.uid).single();
        const info = await getUserSubscriptionInfo();
        setSubInfo(info);
        if (error) throw error;
        const storedPrefs: LocalizationPrefs = readStoredLocalization();
        const remotePrefs: LocalizationPrefs = {
          currency: data.currency || 'USD',
          dateFormat: data.date_format || 'MM/dd/yyyy',
          locale: data.locale || localeForCurrency(data.currency || 'USD'),
        };
        const effectivePrefs: LocalizationPrefs = hasStoredLocalization() && !isDefaultLocalization(storedPrefs) && isDefaultLocalization(remotePrefs)
          ? storedPrefs
          : remotePrefs;

        setProfile(data as UserProfile);
        setName(data.name || '');
        setCurrency(effectivePrefs.currency);
        setDateFormat(effectivePrefs.dateFormat);
        storeLocalization(effectivePrefs);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, "users/" + user?.uid);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleUpdate = async () => {
    const user = auth.currentUser || (typeof (auth as any).getUser === 'function' ? await (auth as any).getUser() : null);
    if (!user) return;
    setLoading(true);
    try {
      const nextPrefs = {
        currency,
        dateFormat,
        locale: localeForCurrency(currency),
      };
      storeLocalization(nextPrefs);
      const payload = {
        uid: user.uid, // user.uid is guaranteed if user exists
        email: profile?.email || user.email,
        name,
        currency: nextPrefs.currency,
        date_format: nextPrefs.dateFormat,
        locale: nextPrefs.locale,
        created_at: profile?.created_at || Date.now(),
        updated_at: Date.now(),
      };
      const { data, error } = await db
        .from('users')
        .upsert([payload], { onConflict: 'uid' })
        .select('*')
        .single();
      if (error) throw error; // data will be null if error
      if (!data || data.currency !== nextPrefs.currency || data.date_format !== nextPrefs.dateFormat || data.name !== name) { // data is UserProfile
        throw new Error('Profile was not saved by the database. Please check your Supabase users table RLS policy.');
      }
      setProfile(data as UserProfile);
      setCurrency((data as UserProfile).currency || nextPrefs.currency);
      setDateFormat((data as UserProfile).date_format || nextPrefs.dateFormat);
      storeLocalization({ // data is UserProfile
        currency: data.currency || nextPrefs.currency,
        dateFormat: data.date_format || nextPrefs.dateFormat,
        locale: data.locale || nextPrefs.locale,
      });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.UPDATE, "users/" + user.uid);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) return;
    setCancelling(true);
    try {
      await cancelSubscription();
      toast.success('Subscription cancelled. You will retain access until the end of the billing period.');
      const info = await getUserSubscriptionInfo();
      setSubInfo(info);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingOverlay show={loading} label="Loading profile" />
      </div>
    );
  }

  const premium = subInfo && isPremium(subInfo.tier, subInfo.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LoadingOverlay show={loading || cancelling} label={cancelling ? 'Cancelling subscription...' : 'Saving preferences'} />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile & Preferences</h2>
        <p className="text-muted-foreground">Manage your account settings and localization preferences.</p>
      </div>

      {/* Subscription Card */}
      <Card className={`border-2 ${premium ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {premium ? (
                <Crown className="h-5 w-5 text-indigo-400" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>Subscription</CardTitle>
            </div>
            {premium && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Premium
              </span>
            )}
          </div>
          <CardDescription>
            {premium
              ? 'You have full access to all premium features.'
              : 'Upgrade to Premium for unlimited AI reports and advanced features.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{premium ? getTierLabel(subInfo!.tier) : 'Free Plan'}</p>
              <p className="text-xs text-muted-foreground">
                {premium
                  ? `Status: ${subInfo!.status === 'active' ? 'Active' : subInfo!.status === 'trialing' ? 'Trial' : subInfo!.status}`
                  : '1 AI report per month · 12-month data retention'
                }
              </p>
            </div>
            <div>
              {premium ? (
                <Button variant="outline" size="sm" onClick={handleCancelSubscription} disabled={cancelling} className="text-red-500 hover:text-red-600">
                  Cancel
                </Button>
              ) : (
                <Link to="/finance/upgrade">
                  <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                    Upgrade <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {premium && subInfo?.endDate && (
            <p className="text-xs text-muted-foreground">
              Renewal date: {new Date(subInfo.endDate).toLocaleDateString('en-IN')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Your basic account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Set your preferred currency and date format.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={v => setCurrency(String(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="JPY">JPY (¥)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={dateFormat} onValueChange={v => setDateFormat(String(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleUpdate} disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
