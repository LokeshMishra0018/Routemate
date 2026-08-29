import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio,
  Users,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  Activity,
  Search,
  Eye,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { LivePresenceResponse, LivePresenceUser, LiveTelemetryEvent } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { useSocket } from '../../context/SocketContext';

export const AdminLiveUsersPage: React.FC = () => {
  const { socket } = useSocket();
  const [selectedUser, setSelectedUser] = useState<LivePresenceUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch live users presence snapshot
  const { data, isLoading, refetch, isRefetching } = useQuery<LivePresenceResponse>({
    queryKey: ['admin-live-presence'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/live/users');
      return res.data.data;
    },
    refetchInterval: 5000, // Poll every 5s as fallback
  });

  // Query user specific events when inspecting
  const { data: userEvents, isLoading: isEventsLoading } = useQuery<LiveTelemetryEvent[]>({
    queryKey: ['admin-user-events', selectedUser?.userId],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await apiClient.get(`/admin/live/events?limit=50`);
      const allEvents: LiveTelemetryEvent[] = res.data.data || [];
      return allEvents.filter((e) => e.userId === selectedUser.userId);
    },
    enabled: !!selectedUser,
  });

  // Listen for real-time presence changes over WebSocket
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = () => {
      refetch();
    };

    socket.on('admin:presence_updated', handlePresenceUpdate);
    return () => {
      socket.off('admin:presence_updated', handlePresenceUpdate);
    };
  }, [socket, refetch]);

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Connecting to Real-time Telemetry Gateway..." />
      </div>
    );
  }

  const liveUsers = data?.users || [];
  const filteredUsers = liveUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.currentAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.currentPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" /> Live Users Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time active student sessions, current screens, readable actions, and device telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Refresh Feed
          </Button>
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-emerald-300">
              {data?.activeNow || 0} Active Now ({data?.idleCount || 0} Idle)
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" /> Total Connected
          </span>
          <div className="text-2xl font-black text-white">{data?.totalOnline || 0}</div>
          <span className="text-[11px] text-slate-400">Authenticated socket sessions</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-400" /> Active Commuters
          </span>
          <div className="text-2xl font-black text-sky-300">{data?.activeNow || 0}</div>
          <span className="text-[11px] text-slate-400">Interacting within last 2m</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-purple-400" /> Mobile Devices
          </span>
          <div className="text-2xl font-black text-purple-300">
            {data?.deviceDistribution?.mobile || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            {data?.totalOnline
              ? Math.round(((data.deviceDistribution.mobile || 0) / data.totalOnline) * 100)
              : 0}
            % of live traffic
          </span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-amber-400" /> Desktop / Laptops
          </span>
          <div className="text-2xl font-black text-amber-300">
            {data?.deviceDistribution?.desktop || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            {data?.totalOnline
              ? Math.round(((data.deviceDistribution.desktop || 0) / data.totalOnline) * 100)
              : 0}
            % of live traffic
          </span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active students by name, email, screen, or action..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Live Users Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Current Screen</th>
                <th className="py-3 px-4">Current Action</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Session Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    No active student sessions currently online.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.socketId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {u.name}
                            {u.role === 'admin' && (
                              <Badge variant="warning" className="text-[9px] px-1 py-0">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <code className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-indigo-300 font-mono">
                        {u.currentPath}
                      </code>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        {u.currentAction}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {u.deviceCategory === 'mobile' ? (
                          <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                        ) : u.deviceCategory === 'tablet' ? (
                          <Tablet className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="capitalize">{u.browserInfo}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {Math.floor(u.sessionDurationSeconds / 60)}m {u.sessionDurationSeconds % 60}s
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isIdle ? (
                        <Badge variant="neutral" className="text-[10px]">
                          Idle (2m+)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          🟢 Active
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(u)}
                        leftIcon={<Eye className="w-3 h-3" />}
                        className="text-[11px] py-1 px-2.5"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Clickstream Inspection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedUser.name} <Badge variant="brand">Live Session</Badge>
                  </h3>
                  <p className="text-xs text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Session Summary */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Current Screen</span>
                <span className="font-mono text-indigo-300 font-bold">{selectedUser.currentPath}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Current Action</span>
                <span className="font-semibold text-emerald-400">{selectedUser.currentAction}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Device & Client</span>
                <span className="text-slate-300 capitalize">
                  {selectedUser.browserInfo} ({selectedUser.deviceCategory})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Session Time</span>
                <span className="text-slate-300">
                  {Math.floor(selectedUser.sessionDurationSeconds / 60)} minutes
                </span>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Recent Action Timeline
              </h4>
              {isEventsLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" text="Loading action history..." />
                </div>
              ) : !userEvents || userEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No explicit action events recorded in this session yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {userEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">{evt.description}</span>
                        <Badge variant="neutral" className="text-[10px] py-0 px-1 font-mono">
                          {evt.eventType}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>
                Close Radar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
