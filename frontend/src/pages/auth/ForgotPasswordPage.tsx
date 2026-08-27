import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Request failed. Please check the email entered.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="glass-panel border-indigo-500/40 text-center p-6 shadow-glow">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
          <Mail className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold text-white">Reset Link Dispatched</CardTitle>
        <CardDescription className="mt-2 text-xs leading-relaxed">
          If an active account exists for <strong className="text-indigo-300">{email}</strong>, a password reset token has been emailed.
        </CardDescription>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/reset-password">
            <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Enter Reset Token
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-700 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-glow">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Forgot Password</CardTitle>
        <CardDescription>Enter your verified student email to receive recovery instructions</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="College Email Address"
            type="email"
            placeholder="student@kiet.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Send Recovery Email
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Password reset failed. Token may be expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="glass-panel border-emerald-500/40 text-center p-6 shadow-glow-trust">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold text-white">Password Reset Complete</CardTitle>
        <CardDescription className="mt-2 text-xs">
          Your new password has been set. You can now log into RouteMate.
        </CardDescription>
        <div className="mt-6">
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
            Sign In with New Password
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-700 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-glow">
          <Lock className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Create New Password</CardTitle>
        <CardDescription>Enter the token received and your new secure password</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Reset Token"
            placeholder="Paste code / token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />

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

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
};
