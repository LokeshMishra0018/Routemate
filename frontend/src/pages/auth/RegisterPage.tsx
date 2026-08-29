import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, User, Building, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { College } from '../../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges] = useState<College[]>([]);
  const [fullName, setFullName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await apiClient.get('/colleges');
        setColleges(res.data.data || []);
        if (res.data.data?.length > 0) {
          setCollegeId(res.data.data[0].id);
        }
      } catch {
        // Fallback default
        setColleges([{ id: 'kiet-default', name: 'KIET Group of Institutions', domain: 'kiet.edu', isActive: true }]);
      }
    };
    fetchColleges();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({
        fullName,
        email,
        password,
        collegeId: collegeId || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="glass-panel border-emerald-500/40 text-center p-6 shadow-glow-trust">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Registration Successful!</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          We have sent an institutional verification email to <strong className="text-emerald-300">{email}</strong>.
          Please check your inbox to verify your student account.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/verify-email', { state: { email } })}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Enter Verification Code
          </Button>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-700 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center shadow-glow mb-3">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Join RouteMate</CardTitle>
        <CardDescription>Safe, verified campus rides and travel companions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Institutional Google Registration */}
        <GoogleSignInButton mode="signup" onError={(msg) => setError(msg)} />

        <div className="relative flex items-center justify-center my-3">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            or sign up with email
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Full Name"
            placeholder="Lokesh Mishra"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Select
            label="Select College / Campus"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            options={colleges.map((c) => ({ value: c.id, label: `${c.name} (@${c.domain})` }))}
            required
          />

          <Input
            label="Institutional Email (@kiet.edu)"
            type="email"
            placeholder="lokesh.mishra@kiet.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="Must match your college's approved email domain."
            required
          />

          <Input
            label="Password (min 8 chars)"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Verified Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer"
        >
          <span>👑 Admin / Guest Access</span>
        </Link>
        <p className="text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};
