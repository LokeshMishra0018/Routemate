import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Mail, Lock, AlertCircle, ArrowRight, Crown, CheckCircle2, X, KeyRound, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const { login, adminProvision } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Admin Provisioning State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionPasscode, setProvisionPasscode] = useState('');
  const [provisionName, setProvisionName] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

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

  const handleAdminProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setIsProvisioning(true);

    try {
      if (!adminProvision) {
        throw new Error('Admin provisioning is not currently available.');
      }
      const res = await adminProvision({
        adminPasscode: provisionPasscode,
        fullName: provisionName,
        email: provisionEmail,
        password: provisionPassword,
      });

      setProvisionSuccess(res.message || 'Account provisioned successfully in verification pending phase (🟡 Yellow Tick)!');
      setEmail(provisionEmail);
      setPassword(provisionPassword);
      setTimeout(() => {
        setShowProvisionModal(false);
        setProvisionSuccess(null);
      }, 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProvisionError(err.message);
      } else {
        setProvisionError('Failed to provision account. Please verify the admin passcode.');
      }
    } finally {
      setIsProvisioning(false);
    }
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

          {/* Institutional Google One-Click Login */}
          <GoogleSignInButton mode="signin" onError={(msg) => setError(msg)} />

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              or password login
            </span>
            <div className="border-t border-slate-800 w-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="College Email"
              type="email"
              placeholder="student@kiet.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
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
                autoComplete="current-password"
              />
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to RouteMate
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
          {/* Bottom Left Admin Provisioner Badge */}
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
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowProvisionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Admin &amp; Guest Provisioner</h3>
                <span className="text-xs text-slate-400">Create a student account with any email (🟡 Pending ID phase)</span>
              </div>
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

            <form onSubmit={handleAdminProvision} className="space-y-3.5">
              <Input
                label="Admin Security Passcode"
                type="password"
                placeholder="Enter secret passcode"
                value={provisionPasscode}
                onChange={(e) => setProvisionPasscode(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4 text-amber-400" />}
                required
              />

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
                label="Any Email Address"
                type="email"
                placeholder="e.g. friend@gmail.com"
                value={provisionEmail}
                onChange={(e) => setProvisionEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                placeholder="••••••••"
                value={provisionPassword}
                onChange={(e) => setProvisionPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <span>🟡 Verification Lifecycle Rule:</span>
                </div>
                <p>
                  Account will be provisioned in the <strong>🟡 Student ID Pending phase</strong>. They can log in normally, post trips, and upload their ID in the Verification Hub for 🔵 Blue Tick approval.
                </p>
              </div>

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
                  Provision &amp; Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
