import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { auth } from "../lib/firebase";

export default function ResetPassword() {
    const [ password, setPassword ] = useState('');
    const [ confirmPassword, setConfirmPassword ] = useState('');
    const [ error, setError ] = useState('');

    const handleSubmit = (e: React.SubmitEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        auth.confirmPasswordReset(password).then(() => {
            window.location.href = '/login';
        }).catch((error: any) => {
            setError(error.message);
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl rounded-2xl">
                <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                    Reset password
                </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                placeholder='e.g, Abc$1'
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 mt-2">
                            <Label htmlFor="password">Confirm password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={confirmPassword}
                                placeholder='e.g, Abc$1'
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        <div className="space-y-2 mt-4">
                            <Button className="primary w-full" type="submit">Change</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}