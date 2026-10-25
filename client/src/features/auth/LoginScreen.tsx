import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiFetch<{
        token: string;
        user: {
          id: string;
          email: string;
          role: 'admin' | 'hr' | 'employee';
          name?: string;
          mustChangePassword: boolean;
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(res.token, res.user);

      if (res.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center font-bold text-white text-xl shadow-md mb-3">
            H
          </div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">HCM Lite</h1>
          <p className="text-sm text-muted mt-1">Sign in to your workplace account</p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader>
            <div>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your work email and password</CardDescription>
            </div>
          </CardHeader>

          {error && (
            <div className="mb-4 p-3 rounded-control bg-red-50 border border-red-200 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />

            <FormField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
