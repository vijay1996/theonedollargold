import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestoreAuthError';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      const p = doc(db, 'users', auth.currentUser.uid);
      getDoc(p).then(d => {
        if (d.exists()) {
          const data = d.data();
          setProfile(data);
          setName(data.name || '');
          setCurrency(data.currency || 'USD');
          setDateFormat(data.dateFormat || 'MM/dd/yyyy');
        }
      }).catch(err => {
        handleFirestoreError(err, OperationType.GET, "users/" + auth.currentUser?.uid);
      });
    }
  }, []);

  const handleUpdate = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const p = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(p, {
        name,
        currency,
        dateFormat,
        updatedAt: new Date().getTime()
      });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
      handleFirestoreError(err, OperationType.UPDATE, "users/" + auth.currentUser.uid);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          <Button onClick={handleUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save Preferences'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
