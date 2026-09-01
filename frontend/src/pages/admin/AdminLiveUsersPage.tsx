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
  Search,
  Eye,
  X,
  RefreshCw,
  Sparkles,
  MapPin,
  Compass,
  Layers,
  ShieldCheck,
  Calendar,
  Navigation,
  CheckCircle2,
  LogOut,
  LogIn,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import {
  LivePresenceResponse,
  LivePresenceUser,
  LiveTelemetryEvent,
  LiveVisitorResponse,
  LiveVisitor,
  VisitorTimelineEvent,
  StudentTimelineEvent,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { useSocket } from '../../context/SocketContext';

export const AdminLiveUsersPage: React.FC = () => {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'students' | 'visitors'>('visitors');
  const [timeRange, setTimeRange] = useState<'live' | 'today' | 'yesterday' | '24h' | '7d'>('live');
  const [selectedUser, setSelectedUser] = useState<LivePresenceUser | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<LiveVisitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch authenticated students presence / session snapshot
  const {
    data: studentsData,
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
    isRefetching: isStudentsRefetching,
  } = useQuery<LivePresenceResponse>({
    queryKey: ['admin-live-presence', timeRange],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/live/users?range=${timeRange}`);
      return res.data.data;
    },
    refetchInterval: timeRange === 'live' ? 5000 : 15000,
  });

  // 2. Fetch public & overview visitors / visitor snapshot
  const {
    data: visitorsData,
    isLoading: isVisitorsLoading,
    refetch: refetchVisitors,
    isRefetching: isVisitorsRefetching,
  } = useQuery<LiveVisitorResponse>({
    queryKey: ['admin-live-visitors', timeRange],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/live/visitors?range=${timeRange}`);
      return res.data.data;
    },
    refetchInterval: timeRange === 'live' ? 5000 : 15000,
  });

  // 3. Query student specific timeline when inspecting student
  const { data: studentTimelineData, isLoading: isStudentTimelineLoading } = useQuery<StudentTimelineEvent[]>({
    queryKey: ['admin-student-timeline', selectedUser?.userId],
    queryFn: async () => {
      if (!selectedUser) return [];
      if (selectedUser.timeline && selectedUser.timeline.length > 0) {
        return selectedUser.timeline;
      }
      const res = await apiClient.get(`/admin/live/users/${selectedUser.userId}/timeline`);
      return res.data.data || [];
    },
    enabled: !!selectedUser,
  });

  // 4. Query visitor specific timeline when inspecting visitor
  const { data: visitorTimelineData, isLoading: isVisitorTimelineLoading } = useQuery<VisitorTimelineEvent[]>({
    queryKey: ['admin-visitor-timeline', selectedVisitor?.sessionId],
    queryFn: async () => {
      if (!selectedVisitor) return [];
      if (selectedVisitor.timeline && selectedVisitor.timeline.length > 0) {
        return selectedVisitor.timeline;
      }
      const res = await apiClient.get(`/admin/live/visitors/${selectedVisitor.sessionId}/timeline`);
      return res.data.data || [];
    },
    enabled: !!selectedVisitor,
  });

  // Listen for real-time presence & visitor changes over WebSocket
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = () => {
      if (timeRange === 'live') refetchStudents();
    };

    const handleVisitorUpdate = () => {
      if (timeRange === 'live') refetchVisitors();
    };

    socket.on('admin:presence_updated', handlePresenceUpdate);
    socket.on('admin:visitor_activity', handleVisitorUpdate);

    return () => {
      socket.off('admin:presence_updated', handlePresenceUpdate);
      socket.off('admin:visitor_activity', handleVisitorUpdate);
    };
  }, [socket, refetchStudents, refetchVisitors, timeRange]);

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
      v.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.dayLabel && v.dayLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalLiveTraffic = (studentsData?.totalOnline || 0) + (visitorsData?.totalActiveVisitors || 0);

  // Student timeline events combined
  const activeStudentTimeline: StudentTimelineEvent[] =
    (studentTimelineData && studentTimelineData.length > 0
      ? studentTimelineData
      : selectedUser?.timeline) || [];

  // Visitor timeline events combined
  const activeVisitorTimeline: VisitorTimelineEvent[] =
    (visitorTimelineData && visitorTimelineData.length > 0
      ? visitorTimelineData
      : selectedVisitor?.timeline) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" /> Live Telemetry & Traffic Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time public landing page visitors, geolocation detection, acquisition channels, and 7-day student session journeys.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Day / Time Range Selector */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setTimeRange('live')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeRange === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Now
            </button>
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeRange === 'today'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Today
            </button>
            <button
              onClick={() => setTimeRange('yesterday')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeRange === 'yesterday'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Yesterday
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                timeRange === '7d'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Past 7 Days
            </button>
          </div>

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
              {totalLiveTraffic} Total Live ({visitorsData?.totalActiveVisitors || 0} Visitors •{' '}
              {studentsData?.totalOnline || 0} Students)
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
            {visitorsData?.totalVisitorsToday || liveVisitors.length} total sessions ({timeRange === 'live' ? 'Today' : timeRange === '24h' ? '24h' : '7 Days'})
          </span>
        </Card>

        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border-emerald-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" /> Logged-In Students
          </span>
          <div className="text-2xl font-black text-emerald-300 flex items-center gap-2">
            {studentsData?.totalOnline || 0}
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Live
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {liveUsers.length} total session{liveUsers.length !== 1 ? 's' : ''} stored ({timeRange === 'live' ? 'Today' : timeRange === '24h' ? '24h' : '7 Days'})
          </span>
        </Card>

        <Card className="glass-card p-4 space-y-1 bg-gradient-to-br from-purple-950/30 to-slate-900/60 border-purple-500/20">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-purple-400" /> Mobile vs Desktop
          </span>
          <div className="text-2xl font-black text-purple-300">
            {visitorsData?.deviceDistribution?.mobile || 0}M / {visitorsData?.deviceDistribution?.desktop || 0}D
          </div>
          <span className="text-[11px] text-slate-400">Visitor client devices</span>
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
            {liveVisitors.length}
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
            {liveUsers.length}
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
                  {isVisitorsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <LoadingSpinner size="sm" text="Loading visitors..." />
                      </td>
                    </tr>
                  ) : filteredVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Globe className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        No website visitors found for {timeRange === 'live' ? 'the active session' : timeRange === '24h' ? 'the past 24 hours' : 'the past 7 days'}.
                        <p className="text-[11px] text-slate-600 mt-1">
                          Open the homepage in a separate tab or mobile phone to see yourself appear live!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredVisitors.map((v) => (
                      <tr key={v.sessionId} className={`transition-colors ${v.isActive ? 'hover:bg-slate-800/40' : 'opacity-60 hover:opacity-80 bg-slate-950/20'}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 ${
                                v.isConverted
                                  ? 'bg-gradient-to-br from-amber-500/20 to-indigo-600/30 border border-amber-400/50 text-amber-300 shadow-glow'
                                  : 'bg-gradient-to-br from-indigo-900/60 to-sky-900/60 border border-sky-500/40 text-sky-200 shadow-sm shadow-sky-500/10'
                              }`}
                            >
                              {v.isConverted ? '🎓' : `#${v.visitorNumber || 1}`}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5 text-xs flex-wrap">
                                <span>{v.convertedUser?.name || v.visitorName || `Visitor #${v.visitorNumber || 1}`}</span>
                                {v.dayLabel && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    v.dayLabel === 'Today'
                                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                      : v.dayLabel === 'Yesterday'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                  }`}>
                                    {v.dayLabel}
                                  </span>
                                )}
                                {v.isConverted && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.2 rounded-full">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                    Converted
                                  </span>
                                )}
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
                                {v.isConverted && v.convertedUser?.email ? (
                                  <span className="text-amber-300/80 font-sans">
                                    Was Visitor #{v.visitorNumber} • {v.convertedUser.email}
                                  </span>
                                ) : (
                                  <span>
                                    {v.sessionId.substring(0, 14)}... ({v.totalEvents} action{v.totalEvents > 1 ? 's' : ''})
                                  </span>
                                )}
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
                    <th className="py-3 px-4">Current / Last Screen</th>
                    <th className="py-3 px-4">Current Action</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Session Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isStudentsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <LoadingSpinner size="sm" text="Loading student sessions..." />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        No authenticated student sessions found for {timeRange === 'live' ? 'the active session' : timeRange === '24h' ? 'the past 24 hours' : 'the past 7 days'}.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.socketId || u.userId}
                        className={`transition-colors ${
                          u.isOnline
                            ? 'hover:bg-slate-800/40'
                            : 'opacity-65 hover:opacity-85 bg-slate-950/20'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.verificationBadge === 'verified' && (
                                  <span title="Blue Tick Verified Student" className="text-sky-400 text-xs">
                                    <ShieldCheck className="w-3.5 h-3.5 inline text-sky-400" />
                                  </span>
                                )}
                                {u.role === 'admin' && (
                                  <Badge variant="warning" className="text-[9px] px-1 py-0">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <span>{u.email}</span>
                                {u.branch && (
                                  <span className="text-[10px] text-slate-500 font-mono">• {u.branch}</span>
                                )}
                              </div>
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
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                u.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
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
                          {u.isOnline ? (
                            u.isIdle ? (
                              <Badge variant="neutral" className="text-[10px]">
                                Idle (2m+)
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active Now
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                              Went Offline
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(u)}
                            leftIcon={<Eye className="w-3 h-3 text-indigo-400" />}
                            className="text-[11px] py-1 px-2.5 border-slate-700 hover:border-indigo-500"
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
                <span className="text-slate-500 block text-[11px]">Location & Network</span>
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
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Landing Page Reading Journey (7-Day Log)
              </h4>
              {isVisitorTimelineLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" text="Loading visitor timeline..." />
                </div>
              ) : activeVisitorTimeline.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No section changes logged yet in this session.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeVisitorTimeline.map((evt) => (
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

      {/* Student Clickstream Inspection Modal (With Full 7-Day Timeline) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-700 border border-indigo-500/40 flex items-center justify-center text-indigo-200 font-bold text-sm shadow-md">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedUser.name}
                    {selectedUser.isOnline ? (
                      <Badge variant="brand">🟢 Active Live</Badge>
                    ) : (
                      <Badge variant="neutral">⚪ Went Offline</Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span>{selectedUser.email}</span>
                    {selectedUser.branch && <span className="text-slate-500">• {selectedUser.branch}</span>}
                  </p>
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
                <span className="text-slate-500 block text-[11px]">Current / Last Screen</span>
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
                <span className="text-slate-500 block text-[11px]">Session Duration</span>
                <span className="text-slate-300">
                  {Math.floor(selectedUser.sessionDurationSeconds / 60)}m {selectedUser.sessionDurationSeconds % 60}s
                </span>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Student Session & Action Timeline (7-Day Log)
              </h4>
              {isStudentTimelineLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" text="Loading action history..." />
                </div>
              ) : activeStudentTimeline.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No action events recorded in this session yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeStudentTimeline.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        evt.category === 'auth'
                          ? 'bg-emerald-950/30 border-emerald-500/30'
                          : evt.category === 'lifecycle'
                          ? 'bg-slate-950/90 border-slate-800/80 opacity-80'
                          : evt.category === 'action'
                          ? 'bg-purple-950/30 border-purple-500/30'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {evt.category === 'auth' && <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {evt.category === 'navigation' && <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          {evt.category === 'action' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          {evt.category === 'lifecycle' && <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <span className="font-bold text-white">{evt.action}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono border border-slate-800">
                            {evt.path}
                          </code>
                          {evt.category && (
                            <Badge variant="neutral" className="text-[9px] py-0 px-1 uppercase tracking-wider">
                              {evt.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
