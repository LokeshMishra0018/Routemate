import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Users,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Crown,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface SecurityPasswordData {
  activePassword: string;
  updatedAt: string;
  updatedBy: string;
  isDefault: boolean;
}

interface ProvisionedAccount {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  verificationStatus: string;
  trustScore: number;
  createdAt: string;
}

export const AdminSecurityPage: React.FC = () => {
  const [passwordData, setPasswordData] = useState<SecurityPasswordData | null>(null);
  const [accounts, setAccounts] = useState<ProvisionedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Show / Hide Password
  const [showPassword, setShowPassword] = useState(true); // Default to visible so admin immediately sees it
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  // Update Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      const [pwdRes, accRes] = await Promise.all([
        apiClient.get('/admin/security/password'),
        apiClient.get('/admin/security/accounts?limit=15'),
      ]);

      setPasswordData(pwdRes.data.data);
      setAccounts(accRes.data.data || []);
    } catch (err: unknown) {
      console.error('Failed to load security settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleCopy = () => {
    if (passwordData?.activePassword) {
      navigator.clipboard.writeText(passwordData.activePassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!newPassword || newPassword.trim().length < 6) {
      setUpdateError('Security password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setUpdateError('New password and confirmation do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await apiClient.put('/admin/security/password', {
        newPassword: newPassword.trim(),
      });

      setUpdateSuccess(res.data.data.message || 'Security password updated successfully in real-time!');
      setPasswordData((prev) =>
        prev
          ? {
              ...prev,
              activePassword: newPassword.trim(),
              updatedAt: new Date().toISOString(),
              isDefault: false,
            }
          : null
      );
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setUpdateSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUpdateError(err.message);
      } else {
        setUpdateError('Failed to update security password.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 text-amber-400" />
            Security Password &amp; Access Controls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic provisioning security password, real-time access rotation, and provisioned account audit log.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSecurityData}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-4 h-4 text-slate-400" />}
          className="border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white shrink-0"
        >
          Refresh Data
        </Button>
      </div>

      {/* Main Grid: Current Password & Update Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Password Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Active Provisioning Password
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Live in MongoDB
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Current Password:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Copy Password"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied && <span className="text-emerald-400">Copied!</span>}
                  </button>
                </div>
              </div>

              <div className="font-mono text-lg font-black tracking-wider text-amber-300 select-all break-all">
                {showPassword ? passwordData?.activePassword || '••••••••' : '••••••••••••'}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Last Rotated:</span>
                <span className="font-semibold text-slate-200">
                  {passwordData?.updatedAt ? new Date(passwordData.updatedAt).toLocaleString() : 'System Default'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated By:</span>
                <span className="font-semibold text-slate-200">{passwordData?.updatedBy || 'System'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How this Password Works:</span>
            </div>
            <p>
              This security password is used in the <strong>[ 👑 Admin / Guest Access ]</strong> modal on the login page to provision verified accounts for friends or guests with non-institutional email addresses.
            </p>
          </div>
        </div>

        {/* Right Column: Update Password Form (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              Change Security Password
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly rotate the admin security password. Any account provisioning requests will immediately require the new password.
            </p>
          </div>

          {updateError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{updateError}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{updateSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input
              label="New Security Password"
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter new security password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4 text-indigo-400" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <Input
              label="Confirm New Security Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new security password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-emerald-400" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdating}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                Update Security Password
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 📋 Bottom Section: Recently Registered & Provisioned Accounts Table */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              Recent Accounts Audit Log
            </h2>
            <p className="text-xs text-slate-400">
              Users registered or provisioned in the platform.
            </p>
          </div>
          <span className="text-xs text-slate-400">{accounts.length} recent accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Verification Stage</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
                        {acc.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{acc.fullName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{acc.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {acc.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {acc.verificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          🔵 Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          🟡 ID Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">★ {acc.trustScore}%</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
