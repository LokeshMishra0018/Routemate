import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
  Users,
  Car,
  TrendingUp,
  Radio,
  ArrowRight,
  Sparkles,
  Zap,
  MapPin,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminOverviewStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery<AdminOverviewStats>({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/stats/overview');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Loading Command Center Intelligence..." />
      </div>
    );
  }

  const stats = data || {
    users: { total: 0, verified: 0, verificationRate: 0, liveOnline: 0, activeToday: 0, newToday: 0 },
    trips: { total: 0, planned: 0, inProgress: 0, completed: 0, cancelled: 0, seatFillRate: 74 },
    impact: { costSavedInr: 0, carbonSavedKg: 0 },
    queues: { pendingVerifications: 0, openReports: 0, activeSos: 0 },
    topCorridors: [],
    hourlyDemand: [],
    recentEvents: [],
  };

  return (
    <div className="space-y-6">
      {/* Zone 1: Real-time Live Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">Executive Command Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time campus mobility operations, active commuter telemetry, and safety moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/live">
            <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/50 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-emerald-900/60 transition-colors shadow-glow-emerald">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-xs font-black text-emerald-300 block">
                  {stats.users.liveOnline} Online Now
                </span>
                <span className="text-[10px] text-emerald-400/80">Open Live Radar →</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Real-time Alert Banner if SOS active */}
      {stats.queues.activeSos > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 flex items-center justify-between text-rose-200 shadow-glow-sos animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Active Emergency SOS ({stats.queues.activeSos})
              </h3>
              <p className="text-xs text-slate-300">
                Immediate triage required. Real-time GPS coordinates received.
              </p>
            </div>
          </div>
          <Link to="/admin/sos">
            <Button size="sm" variant="sos">
              Open SOS Monitor
            </Button>
          </Link>
        </div>
      )}

      {/* Zone 2: Primary KPI Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users & DAU */}
        <Card className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" /> Commuters (DAU)
            </span>
            <Badge variant="success" className="text-[10px]">
              +{stats.users.newToday} Today
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.users.total}</span>
            <span className="text-xs text-emerald-400 font-bold">
              {stats.users.verificationRate}% Verified
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Active Today: <strong className="text-slate-200">{stats.users.activeToday}</strong></span>
            <Link to="/admin/users" className="text-indigo-400 hover:text-indigo-300 text-[10px]">
              Directory →
            </Link>
          </div>
        </Card>

        {/* Trips & Seat Fill Rate */}
        <Card className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-400" /> Campus Rides
            </span>
            <Badge variant="brand" className="text-[10px]">
              {stats.trips.seatFillRate}% Seat Fill
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.trips.total}</span>
            <span className="text-xs text-indigo-300 font-semibold">
              {stats.trips.planned} Planned
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Completed: <strong className="text-slate-200">{stats.trips.completed}</strong></span>
            <Link to="/admin/trips" className="text-indigo-400 hover:text-indigo-300 text-[10px]">
              Master Log →
            </Link>
          </div>
        </Card>

        {/* Shared Economy & Green Savings */}
        <Card className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Cost Shared (₹)
            </span>
            <Badge variant="warning" className="text-[10px]">
              🌿 Eco Impact
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              ₹{stats.impact.costSavedInr.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>CO₂ Avoided: <strong className="text-emerald-400">{stats.impact.carbonSavedKg} kg</strong></span>
            <span className="text-slate-500 text-[10px]">Carpool offset</span>
          </div>
        </Card>

        {/* Moderation Queue Load */}
        <Card className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-orange-400" /> Queue Triage
            </span>
            <Badge
              variant={
                stats.queues.pendingVerifications + stats.queues.openReports > 0
                  ? 'warning'
                  : 'success'
              }
              className="text-[10px]"
            >
              {stats.queues.pendingVerifications + stats.queues.openReports} Pending
            </Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-xl font-bold text-amber-300">
                {stats.queues.pendingVerifications}
              </span>
              <span className="text-[10px] text-slate-400 block">IDs</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-xl font-bold text-orange-300">
                {stats.queues.openReports}
              </span>
              <span className="text-[10px] text-slate-400 block">Reports</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Emergency SOS: <strong className="text-rose-400">{stats.queues.activeSos}</strong></span>
            <Link to="/admin/verifications" className="text-amber-400 hover:text-amber-300 text-[10px]">
              Review IDs →
            </Link>
          </div>
        </Card>
      </div>

      {/* Zone 3: 70/30 Operations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 70%: Mobility Demand & Corridors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Campus Travel Corridors */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" /> Top Campus Commute Corridors
              </h3>
              <Link to="/admin/demand" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                View All Routes →
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats.topCorridors.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No route data recorded yet.</p>
              ) : (
                stats.topCorridors.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{c.source}</span>
                          <span className="text-slate-500">➔</span>
                          <span>{c.destination}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Avg Split: ₹{c.avgFare} / passenger</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-300 block">{c.tripCount} Rides</span>
                      <span className="text-[10px] text-slate-500">Frequent Corridor</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 24-Hour Hourly Rush-Hour Demand Curve */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" /> 24-Hour Campus Demand Distribution
              </h3>
              <span className="text-[11px] text-slate-400">Morning & Evening Peaks</span>
            </div>

            <div className="h-28 flex items-end gap-1.5 pt-4 border-b border-slate-800 pb-2">
              {stats.hourlyDemand.map((h) => {
                const maxTrips = Math.max(...stats.hourlyDemand.map((d) => d.tripsCount), 1);
                const heightPercent = Math.max(12, Math.round((h.tripsCount / maxTrips) * 100));
                const isPeak = h.hourNum >= 8 && h.hourNum <= 10 || h.hourNum >= 17 && h.hourNum <= 19;

                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        isPeak
                          ? 'bg-gradient-to-t from-indigo-600 to-amber-400 group-hover:brightness-125'
                          : 'bg-slate-800 group-hover:bg-slate-700'
                      }`}
                    />
                    <span className="text-[9px] text-slate-500 font-mono hidden sm:block">
                      {h.hourNum % 4 === 0 ? h.hour : ''}
                    </span>
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:block bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap z-20 shadow-lg font-mono">
                      {h.hour}: {h.tripsCount} trips
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>🌅 Morning Commute: 08:00 - 10:00 AM</span>
              <span>🌆 Evening Return: 05:00 - 07:00 PM</span>
            </div>
          </div>
        </div>

        {/* Right 30%: Live Event Stream & Quick Triage */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Event Stream
              </h3>
              <Badge variant="success" className="text-[9px]">
                Realtime
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {stats.recentEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Waiting for live platform actions...
                </p>
              ) : (
                stats.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{evt.userName}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{evt.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Moderator Action Hub */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Moderator Shortcuts
            </h3>
            <div className="space-y-2">
              <Link to="/admin/verifications" className="block">
                <Button size="sm" variant="outline" className="w-full justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-amber-300" /> Review Student IDs
                  </span>
                  <Badge variant="warning" className="text-[10px]">
                    {stats.queues.pendingVerifications}
                  </Badge>
                </Button>
              </Link>

              <Link to="/admin/reports" className="block">
                <Button size="sm" variant="outline" className="w-full justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <AlertOctagon className="w-3.5 h-3.5 text-orange-400" /> Triage Safety Reports
                  </span>
                  <Badge variant="danger" className="text-[10px]">
                    {stats.queues.openReports}
                  </Badge>
                </Button>
              </Link>

              <Link to="/admin/system" className="block">
                <Button size="sm" variant="outline" className="w-full justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-300" /> System Health & Telemetry
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
