import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  ArrowLeft,
  Crown,
  UserCheck,
  MapPin,
  Calendar,
  LogOut,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Group } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar, Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { LoadingSpinner, ErrorState } from '../../components/ui/EmptyState';
import { formatIndianCurrency } from '../../lib/utils';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data: group, isLoading, isError, refetch } = useQuery({
    queryKey: ['group-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${id}`);
      return res.data.data as Group;
    },
    enabled: !!id,
  });

  // Join Group Mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/groups/${id}/join`);
    },
    onSuccess: () => {
      success('Joined Group', 'You are now an active member of this travel group.');
      queryClient.invalidateQueries({ queryKey: ['group-detail', id] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to join group', err.message);
    },
  });

  // Leave Group Mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/groups/${id}/leave`);
    },
    onSuccess: () => {
      success('Left Group', 'You have left the travel group.');
      queryClient.invalidateQueries({ queryKey: ['group-detail', id] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to leave group', err.message);
    },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading group details..." />;
  if (isError || !group) return <ErrorState message="Could not load group details." onRetry={() => refetch()} />;

  const isMember = group.members?.some((m) => m.userId === user?.id && m.status === 'active');
  const isOwner = group.ownerId === user?.id;
  const isFull = group.currentMemberCount >= group.maxCapacity;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/groups"
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </Link>
        <Badge variant={isFull ? 'danger' : 'success'}>
          {group.currentMemberCount} / {group.maxCapacity} Members
        </Badge>
      </div>

      {/* Hero Group Card */}
      <Card className="glass-panel border-slate-700 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Campus Travel Group
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{group.name}</h1>
            {group.description && <p className="text-xs text-slate-300 mt-2 max-w-xl">{group.description}</p>}
          </div>

          <div className="flex items-center gap-3">
            {!isMember && (
              <Button
                variant="primary"
                leftIcon={<UserPlus className="w-4 h-4" />}
                disabled={isFull}
                onClick={() => joinMutation.mutate()}
                isLoading={joinMutation.isPending}
              >
                {isFull ? 'Group is Full' : 'Join Travel Group'}
              </Button>
            )}

            {isMember && !isOwner && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={() => leaveMutation.mutate()}
                isLoading={leaveMutation.isPending}
              >
                Leave Group
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Cost Sharing Breakdown */}
        {group.costSplit && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Estimated Fare
              </span>
              <span className="text-lg font-bold text-slate-100">
                {formatIndianCurrency(group.costSplit.totalEstimatedCost)}
              </span>
            </div>

            <div className="p-2 border-y sm:border-y-0 sm:border-x border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Active Passengers
              </span>
              <span className="text-lg font-bold text-indigo-400">{group.currentMemberCount} Students</span>
            </div>

            <div className="p-2">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Per-Student Share
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatIndianCurrency(group.costSplit.costPerMember)}
              </span>
            </div>
          </div>
        )}

        {/* Members Roster */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Group Members Roster</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.members?.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={member.user?.fullName}
                    src={member.user?.avatarUrl}
                    size="sm"
                    verified={member.user?.verificationStatus === 'approved'}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      {member.user?.fullName || 'Student'}
                      {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-400" aria-label="Group Host" />}
                    </h4>
                    <p className="text-[11px] text-slate-400">{member.user?.collegeName || 'KIET'}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <TrustScoreMeter score={member.user?.trustScore || 0} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
