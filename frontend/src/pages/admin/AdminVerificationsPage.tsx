import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Download,
  Building,
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, Avatar } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

/**
 * Authenticated Document Viewer for Student ID Photos & PDFs
 * Fetches the binary file via apiClient with auth headers and converts to a local Blob URL
 */
const AuthenticatedDocumentViewer: React.FC<{
  documentUrl: string;
  documentMimeType?: string;
  className?: string;
  isThumbnail?: boolean;
}> = ({ documentUrl, documentMimeType, className = '', isThumbnail = false }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = async () => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(documentUrl, { responseType: 'blob' });
      const headerMime = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined;
      const mime = headerMime || documentMimeType || 'image/jpeg';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err: unknown) {
      setError('Could not load document from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [documentUrl]);

  const isPdf = documentMimeType === 'application/pdf' || documentUrl?.endsWith('.pdf');

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-slate-400 gap-2 ${className}`}>
        <LoadingSpinner size="sm" text="Loading ID document..." />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-slate-400 text-center gap-2 ${className}`}>
        <AlertCircle className="w-6 h-6 text-amber-400" />
        <span className="text-xs text-slate-300">{error || 'Failed to load ID document.'}</span>
        <Button size="sm" variant="outline" onClick={fetchDocument} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Load
        </Button>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center gap-3 ${className}`}>
        <FileText className="w-12 h-12 text-indigo-400" />
        <div>
          <h4 className="text-sm font-bold text-slate-200">PDF Student ID Document</h4>
          <p className="text-xs text-slate-400">Click below to preview or download</p>
        </div>
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          download="student_id_document.pdf"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Open / Download PDF
        </a>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <img
        src={blobUrl}
        alt="Student ID Document"
        className={
          isThumbnail
            ? 'w-full h-full object-cover group-hover:scale-105 transition-transform'
            : 'max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-slate-700'
        }
      />
      {!isThumbnail && (
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          download="student_id_document.png"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2.5 font-semibold"
        >
          <Download className="w-3.5 h-3.5" /> Download Original Document
        </a>
      )}
    </div>
  );
};

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
      try {
        await apiClient.patch(`/admin/verifications/${id}/approve`);
      } catch {
        await apiClient.patch(`/admin/verifications/${id}`, { status: 'approved' });
      }
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
      try {
        await apiClient.patch(`/admin/verifications/${id}/reject`, { reason });
      } catch {
        await apiClient.patch(`/admin/verifications/${id}`, { status: 'rejected', rejectionReason: reason });
      }
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
            <Card key={req.id} className="glass-card p-5 space-y-4 border-slate-700/60 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={req.user?.fullName} src={req.user?.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{req.user?.fullName || 'Student'}</span>
                      <TrustBadge tier="partially_verified" iconOnly size="xs" />
                    </h4>
                    <p className="text-xs text-slate-400">
                      {req.user?.collegeName || 'KIET'} • {req.user?.email}
                    </p>
                  </div>
                </div>
                <Badge variant="warning" size="sm">
                  Pending
                </Badge>
              </div>

              {/* Document Thumbnail / Quick View */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">Uploaded Student ID</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {req.documentSize ? `${(req.documentSize / 1024).toFixed(0)} KB` : ''} ({req.documentMimeType?.split('/')[1]?.toUpperCase() || 'IMG'})
                  </span>
                </div>

                {/* Thumbnail Banner */}
                <div
                  onClick={() => setSelectedReq(req)}
                  className="cursor-pointer group relative h-36 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center hover:border-indigo-500/50 transition-all"
                >
                  <AuthenticatedDocumentViewer
                    documentUrl={req.documentUrl}
                    documentMimeType={req.documentMimeType}
                    isThumbnail
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-white backdrop-blur-[1px]">
                    <Eye className="w-4 h-4" /> Click to Inspect Document
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => setSelectedReq(req)}
                  className="text-xs"
                >
                  Inspect Document
                </Button>

                <div className="flex items-center gap-2">
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
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View & Inspect Document Modal */}
      <Modal
        isOpen={!!selectedReq && !isRejectModalOpen}
        onClose={() => setSelectedReq(null)}
        title={`Inspect Student ID: ${selectedReq?.user?.fullName || 'Student'}`}
        description="Verify student name, photo, and institutional credentials before approving."
      >
        {selectedReq && (
          <div className="space-y-4 pt-2">
            {/* Student Metadata Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Student Name</span>
                <span className="font-bold text-slate-100">{selectedReq.user?.fullName || 'Student'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Email Address</span>
                <span className="text-slate-300 truncate block">{selectedReq.user?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">College</span>
                <span className="text-slate-300 truncate block">{selectedReq.user?.collegeName || 'KIET'}</span>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
              <AuthenticatedDocumentViewer
                documentUrl={selectedReq.documentUrl}
                documentMimeType={selectedReq.documentMimeType}
                className="w-full"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setSelectedReq(null)}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  leftIcon={<XCircle className="w-4 h-4" />}
                  onClick={() => setIsRejectModalOpen(true)}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => approveMutation.mutate(selectedReq.id)}
                  isLoading={approveMutation.isPending}
                >
                  Approve Verified ID
                </Button>
              </div>
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
