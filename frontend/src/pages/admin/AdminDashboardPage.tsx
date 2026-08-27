import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner, ErrorState } from '../../components/ui/EmptyState';

export const AdminDashboardPage: React.FC = () => {
  // Fetch pending verifications count
  const { data: verifications } = useQuery({
    queryKey: ['admin-pending-verifications-count'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/verifications');
      return res.data.data;
    },
  });

  // Fetch pending reports count
  const { data: reports } = useQuery({
    queryKey: ['admin-reports-count'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/reports?status=pending');
      return res.data.data;
    },
  });

  // Fetch active SOS count
  const { data: sosEvents } = useQuery({
    queryKey: ['admin-sos-count'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/sos-events?status=active');
      return res.data.data;
    },
  });

  const pendingVerifsCount = verifications?.length || 0;
  const pendingReportsCount = reports?.length || 0;
  const activeSosCount = sosEvents?.length || 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" /> Moderation Overview
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Campus safety control panel for identity verification, incident moderation, and real-time emergency triage.
        </p>
      </div>

      {/* Real-time Alert Banner if SOS active */}
      {activeSosCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 flex items-center justify-between text-rose-200 shadow-glow-sos animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Active Emergency SOS ({activeSosCount})</h3>
              <p className="text-xs text-slate-300">Immediate attention required. GPS coordinates received.</p>
            </div>
          </div>
          <Link to="/admin/sos">
            <Button size="sm" variant="sos">
              Open SOS Monitor
            </Button>
          </Link>
        </div>
      )}

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Verification Queue */}
        <Card className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <Badge variant={pendingVerifsCount > 0 ? 'warning' : 'success'}>
              {pendingVerifsCount} Pending
            </Badge>
          </div>
          <div>
            <span className="text-2xl font-black text-white">{pendingVerifsCount}</span>
            <span className="block text-xs font-semibold text-slate-300 mt-0.5">ID Verification Requests</span>
            <p className="text-[11px] text-slate-400 mt-1">Student college cards awaiting verification.</p>
          </div>
          <Link to="/admin/verifications" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Review IDs
            </Button>
          </Link>
        </Card>

        {/* Safety Reports Queue */}
        <Card className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <Badge variant={pendingReportsCount > 0 ? 'danger' : 'success'}>
              {pendingReportsCount} Open
            </Badge>
          </div>
          <div>
            <span className="text-2xl font-black text-white">{pendingReportsCount}</span>
            <span className="block text-xs font-semibold text-slate-300 mt-0.5">Conduct & Safety Reports</span>
            <p className="text-[11px] text-slate-400 mt-1">Student misconduct and safety incident filings.</p>
          </div>
          <Link to="/admin/reports" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Investigate Reports
            </Button>
          </Link>
        </Card>

        {/* User Directory */}
        <Card className="glass-card p-5 space-y-3">
          <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 w-fit">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-white block">Student Accounts</span>
            <span className="block text-xs text-slate-400 mt-0.5">Campus User Directory</span>
            <p className="text-[11px] text-slate-400 mt-1">Inspect student trust scores, safety track records, and suspensions.</p>
          </div>
          <Link to="/admin/users" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Browse Directory
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};
