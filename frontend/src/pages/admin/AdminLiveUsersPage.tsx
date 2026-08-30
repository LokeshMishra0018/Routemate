import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio,
  Users,
  Globe,
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
  MapPin,
  Compass,
  ExternalLink,
  Layers,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import {
  LivePresenceResponse,
  LivePresenceUser,
  LiveTelemetryEvent,
  LiveVisitorResponse,
  LiveVisitor,
  VisitorTimelineEvent,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { useSocket } from '../../context/SocketContext';

export const AdminLiveUsersPage: React.FC = () => {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'students' | 'visitors'>('visitors');
  const [selectedUser, setSelectedUser] = useState<LivePresenceUser | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<LiveVisitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch live authenticated users presence snapshot
  const {
    data: studentsData,
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
    isRefetching: isStudentsRefetching,
  } = useQuery<LivePresenceResponse>({
    queryKey: ['admin-live-presence'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/live/users');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  // 2. Fetch live public & overview page visitors snapshot
  const {
    data: visitorsData,
    isLoading: isVisitorsLoading,
    refetch: refetchVisitors,
    isRefetching: isVisitorsRefetching,
  } = useQuery<LiveVisitorResponse>({
    queryKey: ['admin-live-visitors'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/live/visitors');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  // Query user specific events when inspecting student
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

  // Query visitor specific timeline when inspecting visitor
  const { data: visitorTimeline, isLoading: isVisitorTimelineLoading } = useQuery<VisitorTimelineEvent[]>({
    queryKey: ['admin-visitor-timeline', selectedVisitor?.sessionId],
    queryFn: async () => {
      if (!selectedVisitor) return [];
      const res = await apiClient.get(`/admin/live/visitors/${selectedVisitor.sessionId}/timeline`);
      return res.data.data || [];
    },
    enabled: !!selectedVisitor,
  });

  // Listen for real-time presence & visitor changes over WebSocket
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = () => {
      refetchStudents();
    };

    const handleVisitorUpdate = () => {
      refetchVisitors();
    };

    socket.on('admin:presence_updated', handlePresenceUpdate);
    socket.on('admin:visitor_activity', handleVisitorUpdate);

    return () => {
      socket.off('admin:presence_updated', handlePresenceUpdate);
      socket.off('admin:visitor_activity', handleVisitorUpdate);
    };
  }, [socket, refetchStudents, refetchVisitors]);

  const liveUsers = studentsData?.users || [];
  const liveVisitors = visitorsData?.visitors || [];

  const filteredUsers = liveUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.currentAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.currentPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVisitors = liveVisitors.filter(
    (v) =>
      v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.referrer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.currentAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.browserInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLiveTraffic = (studentsData?.totalOnline || 0) + (visitorsData?.totalActiveVisitors || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" /> Live Telemetry & Traffic Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time public landing page visitors, geolocation detection, acquisition channels, and active student sessions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchStudents();
              refetchVisitors();
            }}
            disabled={isStudentsRefetching || isVisitorsRefetching}
            leftIcon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${isStudentsRefetching || isVisitorsRefetching ? 'animate-spin' : ''}`}
              />
            }
            className="text-xs"
          >
            Refresh Radar
          </Button>
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-lg shadow-emerald-950/40">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-emerald-300">
              {totalLiveTraffic} Total Live Traffic ({visitorsData?.totalActiveVisitors || 0} Visitors •{' '}
              {studentsData?.activeNow || 0} Students)
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-indigo-950/30 to-slate-900/60 border-indigo-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-sky-400" /> Active Web Visitors
          </span>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            {visitorsData?.totalActiveVisitors || 0}
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              Live
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {visitorsData?.totalVisitorsToday || 0} total visits today (Peak: {visitorsData?.peakVisitorsToday || 0})
          </span>
        </Card>

        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border-emerald-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" /> Logged-In Students
          </span>
          <div className="text-2xl font-black text-emerald-300">{studentsData?.activeNow || 0}</div>
          <span className="text-[11px] text-slate-400">
            {studentsData?.totalOnline || 0} authenticated socket sessions
          </span>
        </Card>

        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-purple-950/30 to-slate-900/60 border-purple-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-purple-400" /> Mobile vs Desktop
          </span>
          <div className="text-2xl font-black text-purple-300">
            {visitorsData?.deviceDistribution?.mobile || 0}M / {visitorsData?.deviceDistribution?.desktop || 0}D
          </div>
          <span className="text-[11px] text-slate-400">Visitor device categories</span>
        </Card>

        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-amber-950/30 to-slate-900/60 border-amber-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" /> Top Campus Region
          </span>
          <div className="text-xl font-black text-amber-300 truncate">
            {Object.keys(visitorsData?.cityDistribution || {})[0] || 'Ghaziabad / NCR'}
          </div>
          <span className="text-[11px] text-slate-400">
            {Object.values(visitorsData?.cityDistribution || {})[0] || 0} active from this hub
          </span>
        </Card>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'visitors'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Public & Overview Page Visitors</span>
          <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black">
            {visitorsData?.totalActiveVisitors || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'students'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Authenticated College Students</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
            {studentsData?.totalOnline || 0}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'visitors'
                ? 'Search visitors by City, Region, Referrer (WhatsApp, Instagram), Action, or Browser...'
                : 'Search active students by name, email, screen, or action...'
            }
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* TAB 1: Public & Overview Visitors Radar */}
      {activeTab === 'visitors' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Quick Geographic Breakdown Pills */}
          {visitorsData && Object.keys(visitorsData.cityDistribution).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-400" /> Active Regional Hubs:
              </span>
              {Object.entries(visitorsData.cityDistribution).map(([city, count]) => (
                <span
                  key={city}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-sky-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <MapPin className="w-3 h-3 text-sky-400" />
                  {city}: <strong className="text-white">{count}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Visitors Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Visitor & Session</th>
                    <th className="py-3 px-4">Location & Network</th>
                    <th className="py-3 px-4">Current Screen / Action</th>
                    <th className="py-3 px-4">Acquisition Referrer</th>
                    <th className="py-3 px-4">Device & Client</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Globe className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        No active website visitors in the last 15 minutes.
                        <p className="text-[11px] text-slate-600 mt-1">
                          Open the homepage in a separate tab or on your phone to see yourself appear here live!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredVisitors.map((v) => (
                      <tr key={v.sessionId} className={`transition-colors ${v.isActive ? 'hover:bg-slate-800/40' : 'opacity-60 hover:opacity-80 bg-slate-950/20'}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-900/60 to-sky-900/60 border border-sky-500/40 flex items-center justify-center text-sky-200 font-black text-[11px] shadow-sm shadow-sky-500/10 shrink-0">
                              #{v.visitorNumber || 1}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2 text-xs">
                                <span>{v.visitorName || `Visitor #${v.visitorNumber || 1}`}</span>
                                {v.isActive ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/60 px-1.5 py-0.2 rounded-full">
                                    Left site
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {v.sessionId.substring(0, 14)}... ({v.totalEvents} action{v.totalEvents > 1 ? 's' : ''})
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sky-300 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-sky-400" /> {v.city}, {v.region}
                            </span>
                            <span className="text-[10px] text-slate-400">{v.isp}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                              {v.currentAction}
                            </span>
                            {v.currentSection && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                📍 #{v.currentSection}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-block ${
                              v.referrer.includes('WhatsApp')
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : v.referrer.includes('Instagram')
                                ? 'bg-pink-500/10 text-pink-300 border-pink-500/30'
                                : v.referrer.includes('Google')
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {v.referrer}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            {v.deviceCategory === 'mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                            ) : v.deviceCategory === 'tablet' ? (
                              <Tablet className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span className="capitalize">{v.browserInfo}</span>
                            <span className="text-[10px] text-slate-500">({v.screenResolution})</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {Math.floor(v.sessionDurationSeconds / 60)}m {v.sessionDurationSeconds % 60}s
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVisitor(v)}
                            leftIcon={<Eye className="w-3 h-3 text-sky-400" />}
                            className="text-[11px] py-1 px-2.5 border-slate-700 hover:border-sky-500"
                          >
                            Timeline
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authenticated College Students */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
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
                        <Users className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        No authenticated student sessions currently active.
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
        </div>
      )}

      {/* Visitor Clickstream & Section Timeline Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900/60 to-sky-900/60 border border-sky-500/40 flex items-center justify-center text-sky-200 font-black text-xs shadow-md shrink-0">
                  #{selectedVisitor.visitorNumber || 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedVisitor.visitorName || `Visitor #${selectedVisitor.visitorNumber || 1}`}
                    <Badge variant={selectedVisitor.isActive ? 'brand' : 'neutral'}>
                      {selectedVisitor.isActive ? '🟢 Active Session' : '⚪ Left Site'}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedVisitor.city}, {selectedVisitor.region} • Session: {selectedVisitor.sessionId.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Session Summary Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Location & ISP</span>
                <span className="font-semibold text-sky-300">
                  {selectedVisitor.city}, {selectedVisitor.region}
                </span>
                <span className="text-[10px] text-slate-400 block">{selectedVisitor.isp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Acquisition Referrer</span>
                <span className="font-semibold text-emerald-400">{selectedVisitor.referrer}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Device & Screen</span>
                <span className="text-slate-300 capitalize">
                  {selectedVisitor.browserInfo} on {selectedVisitor.deviceCategory} ({selectedVisitor.screenResolution})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Total Time Active</span>
                <span className="text-slate-300">
                  {Math.floor(selectedVisitor.sessionDurationSeconds / 60)}m {selectedVisitor.sessionDurationSeconds % 60}s ({selectedVisitor.totalEvents} actions)
                </span>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Landing Page Reading Journey
              </h4>
              {isVisitorTimelineLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" text="Loading visitor timeline..." />
                </div>
              ) : selectedVisitor.timeline.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No section changes logged yet in this session.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedVisitor.timeline.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">{evt.action}</span>
                        {evt.section && (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1 font-mono">
                            #{evt.section}
                          </Badge>
                        )}
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
              <Button size="sm" variant="outline" onClick={() => setSelectedVisitor(null)}>
                Close Timeline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Clickstream Inspection Modal */}
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
