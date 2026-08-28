import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, ArrowDown, Sparkles, CheckCircle2, UserCheck, ShieldCheck, Search, Car } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminFunnelResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminUserFunnelPage: React.FC = () => {
  const { data, isLoading } = useQuery<AdminFunnelResponse>({
    queryKey: ['admin-user-funnel'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/analytics/funnel');
      return res.data.data;
    },
  });

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Analyzing User Conversion Funnels..." />
      </div>
    );
  }

  const stages = data?.stages || [];
  const cohorts = data?.retentionCohorts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-sky-400" /> User Funnels & Retention Cohorts
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track end-to-end student onboarding conversion, drop-off rates, and multi-week commuter retention.
        </p>
      </div>

      {/* 6-Stage Visual Conversion Funnel */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> 6-Stage Student Onboarding Pipeline
          </h3>
          <Badge variant="brand" className="text-xs">
            {data?.period || 'Last 30 Days'}
          </Badge>
        </div>

        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <div key={stage.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{stage.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">{stage.count} students</span>
                  <Badge variant="success" className="text-[10px]">
                    {stage.conversionRate}% Conversion
                  </Badge>
                  {idx > 0 && stage.dropoffRate > 0 && (
                    <Badge variant="danger" className="text-[10px]">
                      -{stage.dropoffRate}% Dropoff
                    </Badge>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                <div
                  style={{ width: `${Math.max(6, stage.conversionRate)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx === 0
                      ? 'bg-indigo-500'
                      : idx === 1
                      ? 'bg-sky-500'
                      : idx === 2
                      ? 'bg-purple-500'
                      : idx === 3
                      ? 'bg-amber-500'
                      : idx === 4
                      ? 'bg-teal-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Week Retention Cohorts Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Weekly Commuter Retention Cohorts
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Percentage of new student signups who continue to book or share rides in subsequent weeks.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Cohort Week</th>
                <th className="py-3 px-4">New Signups</th>
                <th className="py-3 px-4">Week 1 Active</th>
                <th className="py-3 px-4">Week 2 Active</th>
                <th className="py-3 px-4">Week 3 Active</th>
                <th className="py-3 px-4">Week 4 Active</th>
                <th className="py-3 px-4 text-right">30-Day Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {cohorts.map((c) => (
                <tr key={c.week} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-white font-sans">{c.week}</td>
                  <td className="py-3 px-4 text-slate-300">{c.registered} users</td>
                  <td className="py-3 px-4 text-indigo-400">{c.activeW1}</td>
                  <td className="py-3 px-4 text-sky-400">{c.activeW2}</td>
                  <td className="py-3 px-4 text-purple-400">{c.activeW3 > 0 ? c.activeW3 : '-'}</td>
                  <td className="py-3 px-4 text-teal-400">{c.activeW4 > 0 ? c.activeW4 : '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="success" className="text-[11px] font-bold font-sans">
                      {c.retentionRate}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
