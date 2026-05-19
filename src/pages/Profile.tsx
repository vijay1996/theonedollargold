import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';
import LoadingOverlay from '../components/ui/loading-overlay';
import { hasStoredLocalization, isDefaultLocalization, localeForCurrency, readStoredLocalization, storeLocalization } from '../lib/localization';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedPrefs = readStoredLocalization();
    setCurrency(storedPrefs.currency);
    setDateFormat(storedPrefs.dateFormat);

    const init = async () => {
      setLoading(true);
      const user = auth.currentUser || await auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await db.from('users').select('*').eq('uid', user.uid).single();
        if (error) throw error;
        const storedPrefs = readStoredLocalization();
        const remotePrefs = {
          currency: data.currency || 'USD',
          dateFormat: data.date_format || data.dateFormat || 'MM/dd/yyyy',
          locale: data.locale || localeForCurrency(data.currency || 'USD'),
        };
        const effectivePrefs = hasStoredLocalization() && !isDefaultLocalization(storedPrefs) && isDefaultLocalization(remotePrefs)
          ? storedPrefs
          : remotePrefs;

        setProfile(data);
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
    const user = auth.currentUser || await auth.getUser();
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
        uid: user.uid,
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
      if (error) throw error;
      if (!data || data.currency !== nextPrefs.currency || data.date_format !== nextPrefs.dateFormat || data.name !== name) {
        throw new Error('Profile was not saved by the database. Please check your Supabase users table RLS policy.');
      }
      setProfile(data);
      setCurrency(data.currency || nextPrefs.currency);
      setDateFormat(data.date_format || nextPrefs.dateFormat);
      storeLocalization({
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

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingOverlay show={loading} label="Loading profile" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LoadingOverlay show={loading} label="Saving preferences" />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile & Preferences</h2>
        <p className="text-muted-foreground">Manage your account settings and localization preferences.</p>
      </div>

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
            <Select value={currency} onValueChange={setCurrency}>
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
            <Select value={dateFormat} onValueChange={setDateFormat}>
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
