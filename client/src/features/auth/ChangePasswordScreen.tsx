import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      updateUser({ mustChangePassword: false });
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-border">
          <CardHeader>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                You must update your temporary password to continue.
              </CardDescription>
            </div>
          </CardHeader>

          {error && (
            <div className="mb-4 p-3 rounded-control bg-red-50 border border-red-200 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Current Password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Temporary password"
            />

            <FormField
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />

            <FormField
              label="Confirm New Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
