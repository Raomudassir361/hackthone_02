import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';

export function SetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (adminPassword.length < 8) {
      setError('Admin password must be at least 8 characters');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await apiFetch('/setup', {
        method: 'POST',
        body: JSON.stringify({
          companyName,
          adminEmail,
          adminPassword,
        }),
      });

      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center font-bold text-white text-xl shadow-md mb-3">
            H
          </div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">HCM Lite First-Run Setup</h1>
          <p className="text-sm text-muted mt-1">
            Initialize your company workspace and bootstrap your Primary Administrator.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-4 mb-6 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-primary' : 'text-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 1 ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
              1
            </span>
            <span>Company Name</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-primary' : 'text-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 2 ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
              2
            </span>
            <span>Admin Account</span>
          </div>
        </div>

        <Card className="shadow-lg border-border">
          {error && (
            <div className="mb-4 p-3 rounded-control bg-red-50 border border-red-200 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-4">
              <CardHeader>
                <div>
                  <CardTitle>Organization Details</CardTitle>
                  <CardDescription>Enter the official name of your company.</CardDescription>
                </div>
              </CardHeader>

              <FormField
                label="Company Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Saylani Tech Innovations"
              />

              <Button type="submit" variant="primary" className="w-full mt-4">
                Continue to Admin Setup
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFinishSetup} className="space-y-4">
              <CardHeader>
                <div>
                  <CardTitle>Create Primary Administrator</CardTitle>
                  <CardDescription>
                    This account has full control to configure policies and finalize payroll.
                  </CardDescription>
                </div>
              </CardHeader>

              <FormField
                label="Admin Email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
              />

              <FormField
                label="Admin Password"
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />

              <FormField
                label="Confirm Admin Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                >
                  Complete Setup & Open Workspace
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
