import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/EmptyState';

export const VerificationPage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. Fetch current verification request
  const { data: request, isLoading } = useQuery({
    queryKey: ['my-verification-request'],
    queryFn: async () => {
      const res = await apiClient.get('/verification/me');
      return res.data.data;
    },
  });

  // 2. Submit Verification Request
  const submitVerificationMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      const res = await apiClient.post('/verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: async () => {
      success('Verification Submitted', 'Your college ID document has been submitted for review.');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['my-verification-request'] });
      await refreshProfile();
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Submission Failed', err.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        error('File Too Large', 'Maximum allowed ID document size is 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const status = profile?.verificationStatus || request?.status || 'unverified';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <FileCheck className="w-6 h-6 text-emerald-400" /> College ID Verification
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Verify your physical or digital student ID to build campus trust and unlock +30 reputation points.
        </p>
      </div>

      {isLoading && <LoadingSpinner text="Checking verification status..." />}

      {/* Status Alert Banner */}
      {!isLoading && (
        <div className="space-y-4">
          {status === 'approved' && (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-4 shadow-glow-trust">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-300">Identity Verified</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your student ID has been approved by our campus moderators. Your profile proudly features the Verified
                  Student badge.
                </p>
              </div>
            </div>
          )}

          {status === 'pending' && (
            <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-4 shadow-glow">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-300">Verification Under Review</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your student ID was uploaded on {request?.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'recently'} and
                  is being audited by campus moderators. Approvals typically take 1–2 hours.
                </p>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start gap-4 shadow-glow-sos">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-300">Verification Rejected</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Moderator feedback: <em>&ldquo;{request?.rejectionReason || 'Document was blurry or expired.'}&rdquo;</em>
                </p>
                <p className="text-xs text-rose-300 pt-1 font-semibold">Please re-upload a clear, high-resolution ID card below.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Form (visible if unverified or rejected) */}
      {(status === 'unverified' || status === 'rejected') && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" /> Upload Student ID Document
            </CardTitle>
            <CardDescription>
              Accepts PNG, JPG, or PDF (max 5MB). Keep all text and photo clearly visible.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors bg-slate-900/40">
              <input
                type="file"
                id="id-file-upload"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="id-file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-200 block">
                    {selectedFile ? selectedFile.name : 'Click or Drag student ID file here'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports PNG, JPG, WebP, PDF'}
                  </span>
                </div>
              </label>
            </div>

            {selectedFile && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => submitVerificationMutation.mutate(selectedFile)}
                isLoading={submitVerificationMutation.isPending}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Submit ID for Moderator Approval
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Benefits Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-center">
          <span className="text-xl font-black text-emerald-400">+30 Points</span>
          <h4 className="text-xs font-bold text-slate-200">Trust Reputation</h4>
          <p className="text-[11px] text-slate-400">Boosts your visibility and match scoring rank across campus.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-center">
          <ShieldCheck className="w-6 h-6 text-indigo-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-200">Verified Shield</h4>
          <p className="text-[11px] text-slate-400">Appears next to your name on trip cards, chats, and matches.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-center">
          <CheckCircle2 className="w-6 h-6 text-amber-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-200">Group Host Rights</h4>
          <p className="text-[11px] text-slate-400">Host shared rides and access dynamic cost-sharing tools.</p>
        </div>
      </div>
    </div>
  );
};
