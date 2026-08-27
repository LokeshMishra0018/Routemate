import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Clock,
  User,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const AdminVerificationsPage: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // 1. Fetch pending verifications
  const { data: verifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-verifications-list'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/verifications');
      return res.data.data;
    },
  });

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/admin/verifications/${id}/approve`);
    },
    onSuccess: () => {
      success('Verification Approved', 'Student ID verified and +30 trust points granted.');
      setSelectedReq(null);
      queryClient.invalidateQueries({ queryKey: ['admin-verifications-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Approval Failed', err.message);
    },
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiClient.patch(`/admin/verifications/${id}/reject`, { reason });
    },
    onSuccess: () => {
      success('Verification Rejected', 'Student notified of rejection reason.');
      setIsRejectModalOpen(false);
      setSelectedReq(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-verifications-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Rejection Failed', err.message);
    },
  });

  const list = verifications || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-indigo-400" /> Student ID Verifications Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review uploaded student ID cards and college credentials to maintain authentic student trust.
        </p>
      </div>

      {isLoading && <LoadingSpinner text="Fetching verification requests..." />}
      {isError && <ErrorState message="Could not load verification queue." onRetry={() => refetch()} />}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<CheckCircle className="w-7 h-7" />}
          title="Verification Queue Clear"
          description="All student ID verification requests have been processed."
        />
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((req: any) => (
            <Card key={req.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={req.user?.fullName} src={req.user?.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{req.user?.fullName || 'Student'}</h4>
                    <p className="text-xs text-slate-400">
                      {req.user?.collegeName || 'KIET'} • {req.user?.email}
                    </p>
                  </div>
                </div>
                <Badge variant="warning" size="sm">
                  Pending
                </Badge>
              </div>

              {/* Document Link / Preview button */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">Uploaded ID Document</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => setSelectedReq(req)}
                  className="text-xs"
                >
                  View Document
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedReq(req);
                    setIsRejectModalOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  onClick={() => approveMutation.mutate(req.id)}
                  isLoading={approveMutation.isPending}
                >
                  Approve ID
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Document Modal */}
      <Modal
        isOpen={!!selectedReq && !isRejectModalOpen}
        onClose={() => setSelectedReq(null)}
        title={`Student ID: ${selectedReq?.user?.fullName || 'Review'}`}
        description="Verify that name, college name, and expiry date are genuine."
      >
        {selectedReq && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[250px]">
              {selectedReq.documentUrl?.endsWith('.pdf') ? (
                <a
                  href={selectedReq.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-400 underline"
                >
                  Open PDF Document in New Tab
                </a>
              ) : (
                <img
                  src={selectedReq.documentUrl}
                  alt="Student ID Document"
                  className="max-h-72 object-contain rounded-lg shadow-md"
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedReq(null)}>
                Close
              </Button>
              <Button
                variant="success"
                onClick={() => approveMutation.mutate(selectedReq.id)}
                isLoading={approveMutation.isPending}
              >
                Approve Verified ID
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject ID Verification"
        description="Provide feedback to help the student upload a valid credential."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (selectedReq) {
                  rejectMutation.mutate({ id: selectedReq.id, reason: rejectReason });
                }
              }}
              isLoading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <Textarea
            label="Rejection Reason"
            placeholder="E.g. Document image was blurred; student name did not match registered profile."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            required
          />
        </div>
      </Modal>
    </div>
  );
};
