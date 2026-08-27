import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { MailCheck, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryToken = searchParams.get('token') || '';
  const initialEmail = location.state?.email || '';

  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Auto-verify if token is provided in URL query string
  useEffect(() => {
    if (queryToken) {
      handleVerify(queryToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryToken]);

  const handleVerify = async (verificationToken: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/verify-email', { token: verificationToken.trim() });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed. The token may be expired or invalid.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please provide your college email address to resend code.');
      return;
    }
    setResendStatus(null);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setResendStatus('Verification link re-sent! Check your inbox.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification.');
      }
    }
  };

  if (isSuccess) {
    return (
      <Card className="glass-panel border-emerald-500/40 text-center p-6 shadow-glow-trust">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold text-white">Email Verified!</CardTitle>
        <CardDescription className="mt-2">
          Your institutional email has been verified. You gained <strong className="text-emerald-400">+20 Trust Points</strong>.
        </CardDescription>
        <div className="mt-6">
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Proceed to Sign In
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-700 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-glow">
          <MailCheck className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Verify Student Email</CardTitle>
        <CardDescription>Enter the token received in your campus email</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(token);
          }}
          className="space-y-4"
        >
          <Input
            label="Verification Token"
            placeholder="Paste code / hex token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Verify Account
          </Button>
        </form>

        {/* Resend section */}
        <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-center">
          <p className="text-xs text-slate-400">Didn&apos;t receive the email?</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs py-1.5"
            />
            <Button size="sm" variant="secondary" onClick={handleResend} className="shrink-0">
              Resend
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
};
