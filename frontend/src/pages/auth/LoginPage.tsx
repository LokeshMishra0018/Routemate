import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Mail, Lock, AlertCircle, ArrowRight, Crown, CheckCircle2, X, KeyRound, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const { login, adminProvisionSendOtp, adminProvisionVerifyOtp, adminProvisionGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Admin Provisioning State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionTab, setProvisionTab] = useState<'email_otp' | 'google'>('email_otp');
  const [provisionAdminPassword, setProvisionAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(true);
  const [provisionName, setProvisionName] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionUserPassword, setProvisionUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(true);
  const [provisionOtp, setProvisionOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setIsProvisioning(true);

    try {
      if (!adminProvisionSendOtp) {
        throw new Error('Admin provisioning is not currently available.');
      }
      const res = await adminProvisionSendOtp({
        adminPassword: provisionAdminPassword,
        fullName: provisionName,
        email: provisionEmail,
        password: provisionUserPassword,
      });

      setOtpSent(true);
      setResendCountdown(60);
      setProvisionSuccess(res.message || '6-digit verification OTP code sent to your email!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProvisionError(err.message);
      } else {
        setProvisionError('Failed to send verification OTP. Please verify the admin security password.');
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setIsProvisioning(true);

    try {
      if (!adminProvisionVerifyOtp) {
        throw new Error('Admin provisioning verification is not available.');
      }
      const res = await adminProvisionVerifyOtp({
        adminPassword: provisionAdminPassword,
        email: provisionEmail,
        otp: provisionOtp.trim(),
      });

      setProvisionSuccess(res.message || 'Email verified & account activated successfully (🟡 ID Pending)!');
      setEmail(provisionEmail);
      setPassword(provisionUserPassword);
      setTimeout(() => {
        setShowProvisionModal(false);
        setProvisionSuccess(null);
        setOtpSent(false);
        setProvisionOtp('');
      }, 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProvisionError(err.message);
      } else {
        setProvisionError('Invalid verification OTP code. Please try again.');
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleGoogleGuestAuth = async (credential: string) => {
    setProvisionError(null);
    setProvisionSuccess(null);

    if (!provisionAdminPassword.trim()) {
      setProvisionError('Please enter the Admin Security Password before authenticating with Google.');
      throw new Error('Admin Security Password is required');
    }

    if (!adminProvisionGoogle) {
      throw new Error('Google provisioning is not available.');
    }

    await adminProvisionGoogle(provisionAdminPassword.trim(), credential);
  };

  return (
    <>
      <Card className="glass-panel border-slate-700 shadow-2xl relative">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center shadow-glow mb-3">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white">Welcome Back</CardTitle>
          <CardDescription>Log in with your verified institutional email account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex flex-col gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {error.toLowerCase().includes('verify') && (
                <button
                  type="button"
                  onClick={() => navigate('/verify-email', { state: { email } })}
                  className="mt-1 self-start font-bold text-indigo-300 hover:text-indigo-200 underline transition-colors cursor-pointer text-xs"
                >
                  Go to Verification &amp; Enter 6-Digit OTP &rarr;
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="student@kiet.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to RouteMate
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold absolute">
              OR
            </span>
          </div>

          <GoogleSignInButton mode="signin" onError={(msg) => setError(msg)} />
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setProvisionError(null);
              setProvisionSuccess(null);
              setShowProvisionModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
            title="Admin / Guest Account Provisioning"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin / Guest Access</span>
          </button>

          <p className="text-xs text-slate-400">
            New commuter?{' '}
            <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Create account
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* 👑 Admin & Guest Account Provisioner Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowProvisionModal(false);
                setOtpSent(false);
                setProvisionOtp('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Admin &amp; Guest Access</h3>
                <span className="text-xs text-slate-400">Create access with personal email (🟡 Pending ID phase)</span>
              </div>
            </div>

            {/* Master Security Password Input */}
            <div className="mb-4 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30">
              <Input
                label="Admin Security Password"
                type={showAdminPassword ? 'text' : 'password'}
                placeholder="Enter secret admin security password"
                value={provisionAdminPassword}
                onChange={(e) => setProvisionAdminPassword(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4 text-amber-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    title={showAdminPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            {/* Dual Tabs: Email & OTP vs Google Sign-In */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setProvisionTab('email_otp');
                  setProvisionError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  provisionTab === 'email_otp'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📧 Email &amp; OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvisionTab('google');
                  setProvisionError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  provisionTab === 'google'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🌐 With Google
              </button>
            </div>

            {provisionError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{provisionError}</span>
              </div>
            )}

            {provisionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{provisionSuccess}</span>
              </div>
            )}

            {/* TAB 1: Email & OTP Provisioning */}
            {provisionTab === 'email_otp' && (
              <>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3.5">
                    <Input
                      label="Full Name"
                      type="text"
                      placeholder="e.g. Lokesh Mishra or Friend Name"
                      value={provisionName}
                      onChange={(e) => setProvisionName(e.target.value)}
                      leftIcon={<UserIcon className="w-4 h-4" />}
                      required
                    />

                    <Input
                      label="Any Personal Email Address"
                      type="email"
                      placeholder="e.g. friend@gmail.com"
                      value={provisionEmail}
                      onChange={(e) => setProvisionEmail(e.target.value)}
                      leftIcon={<Mail className="w-4 h-4" />}
                      required
                    />

                    <Input
                      label="Password (min 8 characters)"
                      type={showUserPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={provisionUserPassword}
                      onChange={(e) => setProvisionUserPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                          title={showUserPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      required
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowProvisionModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isProvisioning}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                      >
                        Send 6-Digit OTP &rarr;
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                      <span>We sent a 6-digit verification code to:</span>
                      <div className="font-bold text-amber-300 text-sm mt-0.5">{provisionEmail}</div>
                    </div>

                    <Input
                      label="Enter 6-Digit Verification Code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={provisionOtp}
                      onChange={(e) => setProvisionOtp(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-xl tracking-[0.3em] font-mono font-bold"
                      required
                    />

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        &larr; Change Details
                      </button>

                      <button
                        type="button"
                        disabled={resendCountdown > 0 || isProvisioning}
                        onClick={handleSendOtp}
                        className="text-amber-400 hover:text-amber-300 disabled:opacity-50 font-semibold"
                      >
                        {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isProvisioning}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        Verify OTP &amp; Activate Account
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: Google Sign-In Provisioning */}
            {provisionTab === 'google' && (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🌐 Instant Google Authorization</span>
                  </div>
                  <p>
                    Authenticate with your personal Google account. With your <strong>Admin Security Password</strong> entered above, your account will be activated in the <strong>🟡 ID Pending phase</strong> immediately.
                  </p>
                </div>

                <GoogleSignInButton
                  mode="signin"
                  allowAnyDomain={true}
                  customButtonId="google-guest-provision-button"
                  buttonText="Continue with Personal Google Account"
                  onCustomAuth={handleGoogleGuestAuth}
                  onError={(msg) => setProvisionError(msg)}
                />
              </div>
            )}

            <div className="mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <span>🟡 Verification Lifecycle:</span>
              </div>
              <p>
                Account is created in the <strong>🟡 Student ID Pending phase</strong>. You can log in normally and upload your ID later in the Verification Hub for 🔵 Blue Tick approval.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
