import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import LoadingOverlay from '../components/ui/loading-overlay';
import { UserProfile } from './reports/useReportsData';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        const { data, error } = await db.auth.signUp({ email, password });
        if (error) throw error;
        // create profile row if needed, ensuring type consistency
        if (data?.user) {
          await db.from('users').upsert({ uid: data.user.id, email: data.user.email, name: email.split('@')[0], currency: 'USD', date_format: 'MM/dd/yyyy', locale: 'en-US', created_at: new Date().getTime(), updated_at: new Date().getTime() });
        }
        navigate('/finance/dashboard');
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/finance/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      // Redirect to Supabase OAuth flow for Google
      await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/finance/dashboard' } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <LoadingOverlay show={loading} label={isRegister ? 'Creating account' : 'Signing you in'} />
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRegister ? 'Create an account' : 'Log in'}
          </CardTitle>
          <CardDescription>
            {isRegister ? 'Enter your details below to create your account' : 'Enter your email below to login to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" type="button" onClick={handleGoogle} disabled={loading}>
            Google
          </Button>
          
          <div className="mt-4 text-center text-sm">
            {isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="underline underline-offset-4 hover:text-primary font-medium"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
