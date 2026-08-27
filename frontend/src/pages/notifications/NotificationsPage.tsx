import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, AlertCircle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { NotificationItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { cn } from '../../lib/utils';

export const NotificationsPage: React.FC = () => {
  const { success } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Notifications
  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data.data as NotificationItem[];
    },
  });

  // 2. Mark All as Read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      success('Notifications Cleared', 'All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  // 3. Mark Single as Read Mutation
  const markSingleReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const list = notifications || [];
  const unreadCount = list.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-400" /> Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Realtime updates on trip matches, connection requests, chat messages, and safety alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={() => markAllReadMutation.mutate()}
            isLoading={markAllReadMutation.isPending}
          >
            Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      {isLoading && <LoadingSpinner text="Fetching notifications..." />}
      {isError && <ErrorState message="Could not load notifications." onRetry={() => refetch()} />}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<Bell className="w-7 h-7" />}
          title="All Caught Up!"
          description="You have no notifications at the moment. When students interact with your trips, updates will appear here."
        />
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="space-y-3">
          {list.map((notif) => {
            let Icon = Info;
            let iconColor = 'text-indigo-400 bg-indigo-950/80 border-indigo-500/30';

            if (notif.type === 'sos') {
              Icon = ShieldAlert;
              iconColor = 'text-rose-400 bg-rose-950/80 border-rose-500/30';
            } else if (notif.type === 'match') {
              Icon = Sparkles;
              iconColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30';
            }

            return (
              <Card
                key={notif.id}
                className={cn(
                  'glass-card p-4 transition-all flex items-start justify-between gap-4',
                  !notif.isRead && 'bg-slate-900 border-l-4 border-indigo-500 shadow-glow'
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn('p-2.5 rounded-xl border shrink-0', iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">{notif.title}</h4>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.body}</p>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-slate-400 hover:text-white shrink-0"
                    onClick={() => markSingleReadMutation.mutate(notif.id)}
                  >
                    Mark read
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
