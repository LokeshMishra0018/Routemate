import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  History,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  X,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge, Avatar } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { Modal } from '../../components/ui/Modal';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { User } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<'student' | 'admin'>('student');

  // 1. Fetch Users
  const { data: users, isLoading, isError, refetch, isRefetching } = useQuery<User[]>({
    queryKey: ['admin-users-list', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const res = await apiClient.get(`/admin/users?${params.toString()}`);
      return res.data.data;
    },
  });

  // 2. Fetch User Safety History
  const { data: safetyHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-user-safety-history', selectedUserForHistory],
    queryFn: async () => {
      if (!selectedUserForHistory) return null;
      const res = await apiClient.get(`/admin/users/${selectedUserForHistory}/safety-history`);
      return res.data.data;
    },
    enabled: !!selectedUserForHistory,
  });

  // 3. Suspend / Unsuspend Mutation
  const toggleSuspendMutation = useMutation({
    mutationFn: async ({ userId, isSuspended }: { userId: string; isSuspended: boolean }) => {
      if (isSuspended) {
        await apiClient.post(`/admin/users/${userId}/unsuspend`);
      } else {
        await apiClient.post(`/admin/users/${userId}/suspend`, {
          reason: 'Administrator discretionary suspension.',
        });
      }
    },
    onSuccess: (_, variables) => {
      toast({
        type: 'success',
        title: 'User Status Updated',
        message: `Account has been ${variables.isSuspended ? 'unsuspended and restored' : 'suspended and sessions revoked'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Failed to update user status',
      });
    },
  });

  // 4. Role Change Mutation (student <-> admin)
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'student' | 'admin' }) => {
      const res = await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast({
        type: 'success',
        title: 'Role Updated',
        message: `Account role successfully changed to ${variables.newRole === 'admin' ? 'Campus Administrator' : 'Student'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setRoleModalUser(null);
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Role Update Failed',
        message: err.response?.data?.error?.message || 'Failed to change user role',
      });
    },
  });

  const list = users || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Student Directory & Role Governance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search campus commuters, inspect verification tiers, assign roles, and audit account standings.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Refresh
          </Button>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>
      </div>

      {/* Verification Ticks Legend Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Verification Tiers:
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-amber-300">
            <TrustBadge role="admin" tier="admin" iconOnly size="xs" /> <strong>Gold:</strong> Admin
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <TrustBadge role="student" tier="fully_verified" iconOnly size="xs" /> <strong>Blue:</strong> ID Verified
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <TrustBadge role="student" tier="partially_verified" iconOnly size="xs" /> <strong>Orange:</strong> ID Pending
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <TrustBadge role="student" tier="unverified" iconOnly size="xs" /> <strong>Red:</strong> Unverified
          </span>
        </div>
      </div>

      {isLoading && <LoadingSpinner text="Searching student directory..." />}
      {isError && <ErrorState message="Could not fetch user directory." onRetry={() => refetch()} />}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No Users Found"
          description="No students matched your search criteria."
        />
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((u) => {
            const isSuspended = u.status === 'suspended';
            const isAdmin = u.role === 'admin';
            const dynamicTier = isAdmin
              ? 'admin'
              : u.verificationStatus === 'approved'
              ? 'fully_verified'
              : u.verificationStatus === 'pending'
              ? 'partially_verified'
              : 'unverified';

            return (
              <Card key={u.id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Top Avatar & Name Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.fullName || u.email}
                        src={u.avatarUrl}
                        size="md"
                        role={u.role}
                        verified={u.verificationStatus === 'approved'}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{u.fullName || 'Student'}</span>
                          <TrustBadge role={u.role} tier={dynamicTier} iconOnly size="xs" />
                        </h4>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                      </div>
                    </div>

                    <Badge variant={isSuspended ? 'danger' : 'success'} size="sm">
                      {isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>

                  {/* Verification & Role Status Pill Strip */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Role Pill with click to change */}
                    <button
                      onClick={() => {
                        setRoleModalUser(u);
                        setTargetNewRole(isAdmin ? 'student' : 'admin');
                      }}
                      title="Click to assign or change role"
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                        isAdmin
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Users className="w-3 h-3 text-indigo-400" />}
                      <span>{isAdmin ? '⚡ Campus Admin' : '🎓 Student'}</span>
                      <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                    </button>

                    {/* Dynamic Verification Tier Description */}
                    <TrustBadge role={u.role} tier={dynamicTier} size="xs" />
                  </div>

                  {/* Trust Score */}
                  <div className="pt-1">
                    <TrustScoreMeter score={u.trustScore || 0} size="sm" />
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Shield className="w-3.5 h-3.5 text-amber-400" />}
                      onClick={() => {
                        setRoleModalUser(u);
                        setTargetNewRole(isAdmin ? 'student' : 'admin');
                      }}
                      className="text-xs py-1 px-2.5 bg-slate-900 border-slate-700 hover:border-amber-500/50"
                    >
                      {isAdmin ? 'Demote to Student' : 'Promote to Admin'}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<History className="w-3.5 h-3.5 text-slate-400" />}
                      onClick={() => setSelectedUserForHistory(u.id)}
                      className="text-xs py-1 px-2 text-slate-400 hover:text-white"
                    >
                      Audit
                    </Button>
                  </div>

                  {isAdmin ? (
                    <span className="text-[11px] font-bold text-amber-400/80 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      🛡️ Protected Admin
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isSuspended ? 'success' : 'danger'}
                      leftIcon={isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      onClick={() => toggleSuspendMutation.mutate({ userId: u.id, isSuspended })}
                      isLoading={toggleSuspendMutation.isPending}
                      className="text-xs py-1 px-2.5"
                    >
                      {isSuspended ? 'Activate Account' : 'Suspend Account'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role Assignment Confirmation Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" /> Assign Account Role
              </h3>
              <button
                onClick={() => setRoleModalUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Change the role permissions for{' '}
              <strong className="text-white">{roleModalUser.fullName || roleModalUser.email}</strong>:
            </p>

            <div className="space-y-2">
              <label
                onClick={() => setTargetNewRole('student')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  targetNewRole === 'student'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs">Student Commuter</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Standard carpool bookings, trip publishing, and matches.
                    </div>
                  </div>
                </div>
                {targetNewRole === 'student' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
              </label>

              <label
                onClick={() => setTargetNewRole('admin')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  targetNewRole === 'admin'
                    ? 'bg-amber-950/60 border-amber-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs">Campus Administrator</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Full access to Command Center, Live Radar, Verifications, and Reports.
                    </div>
                  </div>
                </div>
                {targetNewRole === 'admin' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setRoleModalUser(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={changeRoleMutation.isPending || targetNewRole === roleModalUser.role}
                onClick={() =>
                  changeRoleMutation.mutate({ userId: roleModalUser.id, newRole: targetNewRole })
                }
              >
                {changeRoleMutation.isPending ? 'Updating...' : `Confirm as ${targetNewRole === 'admin' ? 'Admin' : 'Student'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Safety Audit Modal */}
      <Modal
        isOpen={!!selectedUserForHistory}
        onClose={() => setSelectedUserForHistory(null)}
        title="Student Safety & Incident History"
        description="Comprehensive audit of safety reports filed, reports received, and SOS events."
      >
        {historyLoading && <LoadingSpinner text="Compiling safety records..." />}

        {!historyLoading && safetyHistory && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-lg font-bold text-rose-400">{safetyHistory.reportsReceivedCount || 0}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                  Reports Against
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-lg font-bold text-indigo-400">{safetyHistory.reportsFiledCount || 0}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Reports Filed</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-lg font-bold text-amber-400">{safetyHistory.sosTriggersCount || 0}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold mt-0.5">SOS Triggers</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-slate-300">
              <span className="font-semibold block text-slate-200">Account Standing:</span>
              <p>
                Verification: <strong className="capitalize">{safetyHistory.verificationStatus}</strong> • Trust Score:{' '}
                <strong>{safetyHistory.trustScore} pts</strong>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
