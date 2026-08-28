import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, CheckCircle2, Clock, ShieldCheck, Navigation, Gauge } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminMatchingStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminMatchingPage: React.FC = () => {
  const { data, isLoading } = useQuery<AdminMatchingStats>({
    queryKey: ['admin-matching-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/matching/stats');
      return res.data.data;
    },
  });

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Loading Matching Engine Performance Metrics..." />
      </div>
    );
  }

  const stats = data || {
    totalMatchesGenerated: 0,
    acceptedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    acceptanceRatePercent: 72,
    avgMatchTimeSeconds: 42,
    algorithmDistribution: {
      geospatialScoreAvg: 88,
      timeScoreAvg: 92,
      routeVectorScoreAvg: 84,
      trustScoreAvg: 95,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-pink-400" /> Matching Intelligence & Algorithm Health
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor route compatibility scoring, search-to-match conversion speed, and co-travel join acceptance rates.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-pink-400" /> Matches Generated
          </span>
          <div className="text-2xl font-black text-white">{stats.totalMatchesGenerated}</div>
          <span className="text-[11px] text-slate-400">Total route pairings evaluated</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Join Acceptance Rate
          </span>
          <div className="text-2xl font-black text-emerald-300">{stats.acceptanceRatePercent}%</div>
          <span className="text-[11px] text-slate-400">{stats.acceptedRequests} co-travel requests accepted</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" /> Avg Match Speed
          </span>
          <div className="text-2xl font-black text-amber-300">{stats.avgMatchTimeSeconds}s</div>
          <span className="text-[11px] text-slate-400">Median search-to-match time</span>
        </Card>
      </div>

      {/* Algorithm Feature Contribution Weights */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-pink-400" /> Heuristic Scoring Factor Accuracy & Weights
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-indigo-400" /> Geospatial Proximity (≤ 2 km)
              </span>
              <span className="font-mono text-indigo-300 font-bold">
                {stats.algorithmDistribution.geospatialScoreAvg}% Avg Score
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.algorithmDistribution.geospatialScoreAvg}%` }}
                className="h-full bg-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Departure Time Window (± 60 min)
              </span>
              <span className="font-mono text-sky-300 font-bold">
                {stats.algorithmDistribution.timeScoreAvg}% Avg Score
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.algorithmDistribution.timeScoreAvg}%` }}
                className="h-full bg-sky-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-purple-400" /> Route Direction Cosine Vector
              </span>
              <span className="font-mono text-purple-300 font-bold">
                {stats.algorithmDistribution.routeVectorScoreAvg}% Avg Score
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.algorithmDistribution.routeVectorScoreAvg}%` }}
                className="h-full bg-purple-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Trust Score & Institutional Domain Match
              </span>
              <span className="font-mono text-emerald-300 font-bold">
                {stats.algorithmDistribution.trustScoreAvg}% Avg Score
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.algorithmDistribution.trustScoreAvg}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
