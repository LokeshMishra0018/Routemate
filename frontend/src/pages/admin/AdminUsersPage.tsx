import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  History,
  Star,
  AlertTriangle,
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

export const AdminUsersPage: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string | null>(null);

  // 1. Fetch Users
  const { data: users, isLoading, isError, refetch } = useQuery({
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
        await apiClient.patch(`/admin/users/${userId}/unsuspend`);
      } else {
        await apiClient.patch(`/admin/users/${userId}/suspend`, { reason: 'Moderator discretionary suspension.' });
      }
    },
    onSuccess: (_, variables) => {
      success('User Status Updated', `Account ${variables.isSuspended ? 'unsuspended' : 'suspended'}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Action Failed', err.message);
    },
  });

  const list = users || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Student Directory & Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search campus commuters, inspect verification credentials, and audit safety records.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {isLoading && <LoadingSpinner text="Searching student records..." />}
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
          {list.map((u: any) => {
            const isSuspended = u.isSuspended;
            return (
              <Card key={u.id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
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
                          <TrustBadge
                            role={u.role}
                            tier={u.verificationTier || (u.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                            iconOnly
                            size="xs"
                          />
                        </h4>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                      </div>
                    </div>

                    <Badge variant={isSuspended ? 'danger' : 'success'} size="sm">
                      {isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <TrustScoreMeter score={u.trustScore || 0} size="sm" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<History className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedUserForHistory(u.id)}
                    className="text-xs"
                  >
                    Safety Audit
                  </Button>

                  <Button
                    size="sm"
                    variant={isSuspended ? 'success' : 'danger'}
                    onClick={() => toggleSuspendMutation.mutate({ userId: u.id, isSuspended })}
                    isLoading={toggleSuspendMutation.isPending}
                    className="text-xs"
                  >
                    {isSuspended ? 'Unsuspend' : 'Suspend'}
                  </Button>
                </div>
              </Card>
            );
          })}
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
