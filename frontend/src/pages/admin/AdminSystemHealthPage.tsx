import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Activity, Clock, ShieldCheck, AlertCircle, HardDrive, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminSystemHealth } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminSystemHealthPage: React.FC = () => {
  const { data, isLoading, refetch, isRefetching } = useQuery<AdminSystemHealth>({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/analytics/system');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  if (isLoading && !data) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Polling System Telemetry & Latency Profilers..." />
      </div>
    );
  }

  const health = data || {
    status: 'healthy',
    activeSockets: 0,
    uptimeSeconds: 0,
    memoryUsageMb: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
    requests: { total: 0, rpm: 0, status2xx: 0, status4xx: 0, status5xx: 0, errorRatePercent: 0 },
    latencyMs: { avg: 0, p50: 0, p95: 0, p99: 0 },
  };

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-slate-300" /> System Performance & Error Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time API throughput (RPM), latency percentiles (p50/p95/p99), memory consumption, and error rate monitors.
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
            Poll Now
          </Button>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/60 px-3 py-1.5 rounded-xl">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health.status === 'healthy' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
              }`}
            />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {health.status}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" /> API Latency (p95)
          </span>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {health.latencyMs.p95} ms
          </div>
          <span className="text-[11px] text-slate-400">p50: {health.latencyMs.p50}ms • p99: {health.latencyMs.p99}ms</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-400" /> Throughput (RPM)
          </span>
          <div className="text-2xl font-black text-sky-300 font-mono">
            {health.requests.rpm} RPM
          </div>
          <span className="text-[11px] text-slate-400">{health.requests.total} total requests</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Error Rate
          </span>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {health.requests.errorRatePercent}%
          </div>
          <span className="text-[11px] text-slate-400">5xx: {health.requests.status5xx} • 4xx: {health.requests.status4xx}</span>
        </Card>

        <Card className="glass-card p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" /> Process Uptime
          </span>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {formatUptime(health.uptimeSeconds)}
          </div>
          <span className="text-[11px] text-slate-400">{health.activeSockets} active WebSockets</span>
        </Card>
      </div>

      {/* Memory & Infrastructure Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Node.js Memory Breakdown */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" /> Node.js Memory Profile (V8 Engine)
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Heap Used:</span>
                <span className="text-indigo-300 font-bold">{health.memoryUsageMb.heapUsed} MB</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{
                    width: `${Math.round(
                      (health.memoryUsageMb.heapUsed / Math.max(health.memoryUsageMb.heapTotal, 1)) * 100
                    )}%`,
                  }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Heap Total Allocated:</span>
              <span className="text-white font-bold">{health.memoryUsageMb.heapTotal} MB</span>
            </div>

            <div className="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Resident Set Size (RSS):</span>
              <span className="text-white font-bold">{health.memoryUsageMb.rss} MB</span>
            </div>

            <div className="flex justify-between text-slate-300 py-1.5">
              <span className="text-slate-400">External Native Memory:</span>
              <span className="text-white font-bold">{health.memoryUsageMb.external} MB</span>
            </div>
          </div>
        </div>

        {/* HTTP Status Code Distribution */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> HTTP Status Code Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> 2xx / 3xx (Successful)
              </span>
              <span className="font-mono text-white font-bold">{health.requests.status2xx} reqs</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span className="text-amber-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 4xx (Client Bad Requests / Auth)
              </span>
              <span className="font-mono text-white font-bold">{health.requests.status4xx} reqs</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span className="text-rose-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> 5xx (Server Internal Errors)
              </span>
              <span className="font-mono text-white font-bold">{health.requests.status5xx} reqs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
