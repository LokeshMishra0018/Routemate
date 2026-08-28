import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { MailCheck, AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { OtpInput } from '../../components/auth/OtpInput';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryToken = searchParams.get('token') || '';
  const initialEmail = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // 60-second Resend countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Auto-verify if token is provided in URL query string
  useEffect(() => {
    if (queryToken) {
      handleVerify(queryToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryToken]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || otp).trim();
    if (!code) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/verify-email', {
        otp: code,
        token: code,
        email: email || undefined,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed. The OTP code may be invalid or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your college email address to resend OTP.');
      setIsEditingEmail(true);
      return;
    }
    setError(null);
    setResendStatus(null);
    try {
      await apiClient.post('/auth/resend-otp', { email: email.trim() });
      setResendStatus('A fresh 6-digit OTP has been sent to your inbox!');
      setResendCooldown(60);
      setCanResend(false);
      setOtp('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification OTP.');
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
        <CardDescription className="mt-2 text-slate-300">
          Your institutional student email has been verified. You gained <strong className="text-emerald-400 font-bold">+20 Trust Points</strong>.
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
    <Card className="glass-panel border-slate-700 shadow-2xl max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-glow">
          <MailCheck className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Verify College Email</CardTitle>
        <CardDescription>
          {email ? (
            <span>
              Enter the 6-digit OTP sent to <strong className="text-indigo-300">{email}</strong>
            </span>
          ) : (
            'Enter the 6-digit verification code sent to your student email'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {isEditingEmail && (
          <div className="mb-3">
            <Input
              label="Student College Email"
              type="email"
              placeholder="student@kiet.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Enter the email you registered with"
            />
          </div>
        )}

        {/* 6-Box Interactive OTP Input */}
        <div className="py-2">
          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              setError(null);
            }}
            onComplete={(code) => handleVerify(code)}
            disabled={isLoading}
            hasError={Boolean(error)}
          />
        </div>

        <Button
          type="button"
          variant="primary"
          className="w-full mt-2"
          isLoading={isLoading}
          onClick={() => handleVerify()}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Verify &amp; Activate Account
        </Button>

        {/* Resend OTP Section */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsEditingEmail(!isEditingEmail)}
            className="text-slate-400 hover:text-slate-200 transition-colors underline"
          >
            {isEditingEmail ? 'Done editing' : 'Wrong email? Change'}
          </button>

          <button
            type="button"
            disabled={!canResend || isLoading}
            onClick={handleResend}
            className={`font-semibold flex items-center gap-1.5 transition-colors ${
              canResend
                ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer'
                : 'text-slate-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {canResend ? 'Resend 6-Digit OTP' : `Resend in ${resendCooldown}s`}
          </button>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
};
