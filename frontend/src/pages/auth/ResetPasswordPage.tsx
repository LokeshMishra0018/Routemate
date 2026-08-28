import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { OtpInput } from '../../components/auth/OtpInput';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryToken = searchParams.get('token') || '';
  const initialEmail = location.state?.email || '';

  const [otp, setOtp] = useState(queryToken);
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = otp.trim();
    if (!code) {
      setError('Please enter the 6-digit reset code sent to your email.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        otp: code,
        token: code,
        email: email ? email.trim() : undefined,
        password: newPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Password reset failed. The OTP code may be expired or invalid.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="glass-panel border-emerald-500/40 text-center p-6 shadow-glow-trust max-w-md mx-auto">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold text-white">Password Reset Complete</CardTitle>
        <CardDescription className="mt-2 text-slate-300">
          Your new password has been set. You can now log into RouteMate with your updated credentials.
        </CardDescription>
        <div className="mt-6">
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Sign In with New Password
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-700 shadow-2xl max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-glow">
          <Lock className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Reset Password</CardTitle>
        <CardDescription>Enter the 6-digit code received in your college email</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialEmail && (
            <Input
              label="Student College Email"
              type="email"
              placeholder="student@kiet.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              6-Digit Reset Code
            </label>
            <OtpInput
              length={6}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setError(null);
              }}
              disabled={isLoading}
              hasError={Boolean(error)}
            />
          </div>

          <Input
            label="New Password (min 8 chars)"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Update Password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
};
