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
  LogIn,
  RefreshCw,
  Globe,
  Lock,
  Laptop,
  Smartphone,
  Crown,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminOverviewStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { InteractiveTrendCurve } from '../../components/admin/InteractiveTrendCurve';
import { DonutChart } from '../../components/admin/DonutChart';

export interface RecentLoginRecord {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  verificationStatus: string;
  trustScore: number;
  authMethod: 'google' | 'password';
  deviceInfo: string;
  ipMetadata: string | null;
  loginAt: string;
  lastUsedAt: string;
  isRevoked: boolean;
  isOnline?: boolean;
}

function formatTimeAgo(isoString: string): string {
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export const AdminDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery<AdminOverviewStats>({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/stats/overview');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const {
    data: recentLogins,
    isLoading: isLoadingLogins,
    refetch: refetchLogins,
    isFetching: isFetchingLogins,
  } = useQuery<RecentLoginRecord[]>({
    queryKey: ['admin-recent-logins'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/recent-logins?limit=15');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const latestLogin = recentLogins && recentLogins.length > 0 ? recentLogins[0] : null;

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

      {/* Zone 2.2: Interactive Peak Online Telemetry Curve & Analytical Donut Charts */}
      <div className="space-y-6">
        <InteractiveTrendCurve
          data24h={stats.trendCurves?.hours24 || []}
          data7d={stats.trendCurves?.days7 || []}
          data30d={stats.trendCurves?.days30 || []}
          todayPeak={stats.peakOnline?.todayPeak ?? 0}
          todayPeakTime={stats.peakOnline?.todayPeakTime}
          allTimePeak={stats.peakOnline?.allTimePeak ?? 0}
          allTimePeakDate={stats.peakOnline?.allTimePeakDate}
          currentLive={stats.peakOnline?.currentLive ?? stats.users.liveOnline}
        />

        {/* Visual Analytics Donut Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DonutChart
            title="User Trust & Verification Distribution"
            subtitle="Breakdown of student badge tiers & administrative moderators"
            icon={<ShieldCheck className="w-4 h-4 text-sky-400" />}
            centerLabel="Verified"
            centerValue={`${stats.users.verificationRate}%`}
            segments={[
              {
                label: 'Verified (Blue Tick)',
                value: stats.breakdown?.verifications.verified ?? stats.users.verified,
                color: '#38bdf8',
              },
              {
                label: 'ID Pending / Guests',
                value: stats.breakdown?.verifications.pending ?? 0,
                color: '#f59e0b',
              },
              {
                label: 'Moderators & Admins',
                value: stats.breakdown?.verifications.admin ?? 0,
                color: '#a855f7',
              },
            ]}
          />

          <DonutChart
            title="Authentication Channels Share"
            subtitle="Registered accounts by primary authentication method"
            icon={<Globe className="w-4 h-4 text-rose-400" />}
            centerLabel="Registered"
            centerValue={stats.users.total}
            segments={[
              {
                label: 'Google OAuth',
                value: stats.breakdown?.authMethods.google ?? 0,
                color: '#f43f5e',
              },
              {
                label: 'Email + Password + OTP',
                value: stats.breakdown?.authMethods.emailPassword ?? 0,
                color: '#6366f1',
              },
            ]}
          />
        </div>
      </div>

      {/* Zone 2.5: Real-Time Login Stream & Last Active Commuter */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <LogIn className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Recent Login Activity &amp; Active Sessions
                <Badge variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
                  Live Audit
                </Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Chronological platform access history, auth methods, and device telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchLogins()}
              className="text-xs gap-1.5"
              disabled={isFetchingLogins}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLogins ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>Refresh Stream</span>
            </Button>
            <Link to="/admin/live">
              <Button size="sm" variant="ghost" className="text-xs text-indigo-400 hover:text-indigo-300">
                View Live Telemetry →
              </Button>
            </Link>
          </div>
        </div>

        {/* Highlighted Banner: Currently Active / Online Commuters */}
        {recentLogins && recentLogins.length > 0 && (() => {
          const seen = new Set<string>();
          const uniqueRecent: RecentLoginRecord[] = [];
          for (const r of recentLogins) {
            if (!seen.has(r.userId)) {
              seen.add(r.userId);
              uniqueRecent.push(r);
            }
          }

          // Select strictly online users, or fallback to the single most recent login if none are online
          const onlineUsers = uniqueRecent.filter(r => r.isOnline);
          const displayUsers = onlineUsers.length > 0 ? onlineUsers : uniqueRecent.slice(0, 1);

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  {onlineUsers.length > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-emerald-400 font-bold">
                        {onlineUsers.length} Commuter{onlineUsers.length > 1 ? 's' : ''} Online Right Now
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>Most Recent Session</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {onlineUsers.length} Active Socket{onlineUsers.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {displayUsers.map((commuter) => (
                  <div
                    key={commuter.sessionId}
                    className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-500/60"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <img
                          src={
                            commuter.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(commuter.email)}`
                          }
                          alt={commuter.fullName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-950"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-slate-950 ${
                            commuter.isOnline
                              ? 'bg-emerald-400 ring-emerald-950 animate-pulse'
                              : 'bg-slate-600 ring-slate-900'
                          }`}
                          title={commuter.isOnline ? 'Connected Online Now' : 'Offline Session'}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{commuter.fullName}</span>
                          {commuter.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              <Crown className="w-3 h-3" /> Admin
                            </span>
                          ) : commuter.verificationStatus === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-sky-400" /> Verified Student (Blue Tick)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              🟡 ID Pending
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">{commuter.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap md:justify-end">
                      <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                        {commuter.authMethod === 'google' ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-rose-400" />
                            <span className="font-semibold text-rose-300">Google OAuth</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold text-indigo-300">Email + Password</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-300 truncate max-w-[160px]">{commuter.deviceInfo}</span>
                      </div>

                      <div className="text-right">
                        {commuter.isOnline ? (
                          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Online Right Now
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Last Login: {formatTimeAgo(commuter.loginAt)}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          {new Date(commuter.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(commuter.loginAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Recent Logins Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Commuter</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Auth Method</th>
                <th className="py-3 px-4">Device &amp; Telemetry</th>
                <th className="py-3 px-4">Logged In</th>
                <th className="py-3 px-4 text-right">Trust Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {isLoadingLogins ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <LoadingSpinner size="sm" text="Fetching real-time login sessions..." />
                  </td>
                </tr>
              ) : !recentLogins || recentLogins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent login records recorded yet.
                  </td>
                </tr>
              ) : (
                recentLogins.map((item, idx) => (
                  <tr key={item.sessionId || idx} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={item.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.email)}`}
                            alt={item.fullName}
                            className="w-7 h-7 rounded-lg object-cover bg-slate-900 border border-slate-700"
                          />
                          {item.isOnline && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-950 animate-pulse"
                              title="Online Now"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span>{item.fullName}</span>
                            {item.isOnline && (
                              <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Live
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {item.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          <Crown className="w-3 h-3" /> Admin
                        </span>
                      ) : item.verificationStatus === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-sky-400" /> Blue Tick
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          🟡 ID Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {item.authMethod === 'google' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-semibold">
                          <Globe className="w-3 h-3 text-rose-400" /> Google OAuth
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                          <Lock className="w-3 h-3 text-indigo-400" /> Email/Password
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{item.deviceInfo}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{formatTimeAgo(item.loginAt)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                        {item.trustScore} pts
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
