import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertTriangle, MapPin, Zap, TrendingUp, Clock, Car } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminDemandResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminDemandAnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery<AdminDemandResponse>({
    queryKey: ['admin-demand-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/analytics/demand');
      return res.data.data;
    },
  });

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Aggregating Campus Search Demand & Unmet Routes..." />
      </div>
    );
  }

  const demandRoutes = data?.demandRoutes || [];
  const unservedAlerts = data?.unservedAlerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-purple-400" /> Search Demand & Unmet Routes Radar
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Analyze what campus corridors students are searching for and identify routes where demand exceeds available rides.
        </p>
      </div>

      {/* Unserved Demand Urgent Action Alerts */}
      {unservedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> High-Priority Unserved Route Alerts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {unservedAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> {alert.from} ➔ {alert.to}
                  </span>
                  <Badge variant="warning" className="text-[10px]">
                    {alert.unmetSearches} Unmet Searches
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-200/90">{alert.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demand & Corridor Leaderboard */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Campus Commute Search Volume & Route Utilization
          </h3>
          <span className="text-xs text-slate-400">
            {data?.totalActivePlannedTrips || 0} active planned rides online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Origin ➔ Destination</th>
                <th className="py-3 px-4">Search Volume</th>
                <th className="py-3 px-4">Trips Available</th>
                <th className="py-3 px-4">Unmet Demand Ratio</th>
                <th className="py-3 px-4">Avg Split Fare</th>
                <th className="py-3 px-4">Peak Hour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {demandRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{route.from}</span>
                      <span className="text-slate-500">➔</span>
                      <span>{route.to}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                    {route.searchVolume} searches
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {route.tripsAvailable} rides
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${route.unmetRatioPercent}%` }}
                          className={`h-full ${
                            route.unmetRatioPercent > 60
                              ? 'bg-rose-500'
                              : route.unmetRatioPercent > 30
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">
                        {route.unmetRatioPercent}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-black text-amber-400">
                    ₹{route.avgFare}
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {route.peakTime}
                    </span>
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
