import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertOctagon,
  ShieldAlert,
  CheckCircle,
  XCircle,
  UserX,
  Eye,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'resolved' | 'dismissed'>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [suspendReportedUser, setSuspendReportedUser] = useState(false);

  // 1. Fetch Reports
  const { data: reports, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reports-list', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/reports?status=${statusFilter}`);
      return res.data.data;
    },
  });

  // 2. Resolve Report Mutation
  const resolveReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) return;
      await apiClient.patch(`/admin/reports/${selectedReport.id}/resolve`, {
        status: resolutionAction,
        resolutionNotes: resolutionNotes.trim() || undefined,
        suspendUser: suspendReportedUser,
      });
    },
    onSuccess: () => {
      success('Report Handled', `Report has been marked as ${resolutionAction}.`);
      setSelectedReport(null);
      setResolutionNotes('');
      setSuspendReportedUser(false);
      queryClient.invalidateQueries({ queryKey: ['admin-reports-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Action Failed', err.message);
    },
  });

  const list = reports || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-amber-400" /> Incident & Safety Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Investigate reported user conduct, fare disputes, and safety violations.
          </p>
        </div>

        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'pending', label: '⏳ Pending Review' },
              { value: 'resolved', label: '✅ Resolved' },
              { value: 'dismissed', label: '❌ Dismissed' },
            ]}
          />
        </div>
      </div>

      {isLoading && <LoadingSpinner text="Fetching incident reports..." />}
      {isError && <ErrorState message="Could not load reports queue." onRetry={() => refetch()} />}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<CheckCircle className="w-7 h-7" />}
          title="No Incident Reports in this View"
          description="There are currently no reports matching the selected status filter."
        />
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="space-y-4">
          {list.map((rep: any) => (
            <Card key={rep.id} className="glass-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="danger" size="sm" className="uppercase font-bold">
                      {rep.category.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-400">
                      Filed by: <strong className="text-slate-200">{rep.reporter?.fullName || 'Student'}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium pt-1">&ldquo;{rep.reason}&rdquo;</p>
                </div>

                <Badge variant={rep.status === 'pending' ? 'warning' : 'neutral'} size="sm">
                  {rep.status}
                </Badge>
              </div>

              {rep.evidenceUrls && rep.evidenceUrls.length > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Attached Evidence:</span>
                  {rep.evidenceUrls.map((url: string, uIdx: number) => (
                    <a
                      key={uIdx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 underline block truncate"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              )}

              {rep.status === 'pending' && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedReport(rep)}
                  >
                    Take Action
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Action / Resolution Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Resolve Incident Report"
        description="Record resolution findings and enforce account disciplinary measures if appropriate."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => resolveReportMutation.mutate()}
              isLoading={resolveReportMutation.isPending}
            >
              Submit Resolution
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Select
            label="Resolution Outcome"
            value={resolutionAction}
            onChange={(e) => setResolutionAction(e.target.value as 'resolved' | 'dismissed')}
            options={[
              { value: 'resolved', label: 'Resolved (Action taken / warning issued)' },
              { value: 'dismissed', label: 'Dismissed (Unsubstantiated or invalid)' },
            ]}
          />

          <Textarea
            label="Moderator Resolution Notes"
            placeholder="Document investigation outcome and rationale..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            required
          />

          {selectedReport?.reportedUserId && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="suspend-user-checkbox"
                checked={suspendReportedUser}
                onChange={(e) => setSuspendReportedUser(e.target.checked)}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
              <label htmlFor="suspend-user-checkbox" className="text-xs text-rose-300 font-semibold cursor-pointer">
                Suspend reported user account immediately
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
