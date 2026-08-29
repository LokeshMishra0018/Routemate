import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Search,
  Filter,
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Send,
  Shield,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminTripItem, AdminTripManifest, PaginatedResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export const AdminTripsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers state
  const [inspectTripId, setInspectTripId] = useState<string | null>(null);
  const [cancelModalTrip, setCancelModalTrip] = useState<AdminTripItem | null>(null);
  const [deleteModalTrip, setDeleteModalTrip] = useState<AdminTripItem | null>(null);
  const [revisionModalTrip, setRevisionModalTrip] = useState<AdminTripItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  // 1. Fetch Trips Master List
  const { data, isLoading, refetch, isRefetching } = useQuery<PaginatedResponse<AdminTripItem>>({
    queryKey: ['admin-trips-list', page, statusFilter, searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/admin/trips', {
        params: {
          page,
          pageSize: 15,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery.trim().length > 0 ? searchQuery : undefined,
        },
      });
      return res.data;
    },
  });

  // 2. Fetch Deep Inspection Manifest
  const { data: manifestData, isLoading: isManifestLoading } = useQuery<AdminTripManifest>({
    queryKey: ['admin-trip-manifest', inspectTripId],
    queryFn: async () => {
      if (!inspectTripId) return null;
      const res = await apiClient.get(`/admin/trips/${inspectTripId}/inspect`);
      return res.data.data;
    },
    enabled: !!inspectTripId,
  });

  // 3. Soft Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ tripId, reason }: { tripId: string; reason: string }) => {
      const res = await apiClient.post(`/admin/trips/${tripId}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Trip Cancelled', message: 'The trip was marked cancelled by administrator.' });
      queryClient.invalidateQueries({ queryKey: ['admin-trips-list'] });
      setCancelModalTrip(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.response?.data?.error?.message || 'Failed to cancel trip',
      });
    },
  });

  // 4. Permanent Hard Delete & Purge Mutation (Frees Database Memory)
  const deleteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiClient.delete(`/admin/trips/${tripId}`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Trip Purged from Database',
        message: 'Trip record and all associated requests were permanently wiped to save database memory.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trips-list'] });
      setDeleteModalTrip(null);
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Purge Failed',
        message: err.response?.data?.error?.message || 'Failed to delete trip from database',
      });
    },
  });

  // 5. Toggle Visibility Mutation (Hide / Unhide)
  const visibilityMutation = useMutation({
    mutationFn: async ({ tripId, isHidden }: { tripId: string; isHidden: boolean }) => {
      const res = await apiClient.patch(`/admin/trips/${tripId}/visibility`, { isHidden });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast({
        type: 'success',
        title: variables.isHidden ? 'Trip Hidden' : 'Trip Restored',
        message: variables.isHidden
          ? 'Trip is now delisted from student search and matches.'
          : 'Trip is now visible to students.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trips-list'] });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Visibility Change Failed',
        message: err.response?.data?.error?.message || 'Failed to update visibility',
      });
    },
  });

  // 6. Request Changes Mutation (Host Advisory)
  const requestChangesMutation = useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes: string }) => {
      const res = await apiClient.post(`/admin/trips/${tripId}/request-changes`, { notes });
      return res.data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Revision Request Dispatched',
        message: 'Official advisory alert and email sent directly to the student host.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trips-list'] });
      setRevisionModalTrip(null);
      setRevisionNotes('');
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Request Failed',
        message: err.response?.data?.error?.message || 'Failed to send revision request',
      });
    },
  });

  // 7. Force Complete Mutation
  const forceCompleteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiClient.post(`/admin/trips/${tripId}/force-complete`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Ride Force-Completed',
        message: 'Trip marked as completed and passenger reviews unlocked.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trips-list'] });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Failed to complete trip',
      });
    },
  });

  const trips = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-indigo-400" /> Trips Master Dispatch & Moderation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete campus ride operations registry, visibility moderation, host revision advisories, and database memory cleanup.
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
            Refresh
          </Button>
          <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300">
            <Car className="w-4 h-4 text-indigo-400" /> {pagination.totalCount} Total Rides Logged
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search rides by origin or destination..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All Trip Statuses</option>
            <option value="planning">Planning 🕒</option>
            <option value="confirmed">Confirmed 📅</option>
            <option value="in_progress">In-Progress 🟢</option>
            <option value="completed">Completed ✅</option>
            <option value="cancelled">Cancelled ❌</option>
          </select>
        </div>
      </div>

      {/* Master Trips Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" text="Loading campus trips master log..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Trip Route & ID</th>
                  <th className="py-3 px-4">Host Student</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Mode / Seats</th>
                  <th className="py-3 px-4">Split Fare</th>
                  <th className="py-3 px-4">Status & Discovery</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No trips found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Route */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{t.source}</span>
                            <span className="text-slate-500">➔</span>
                            <span>{t.destination}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {t.id}</span>
                        </div>
                      </td>

                      {/* Host */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{t.hostName}</div>
                        <div className="text-[11px] text-slate-400">{t.hostEmail}</div>
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {t.travelDate}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {t.departureTime}
                        </div>
                      </td>

                      {/* Mode & Seats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" className="capitalize text-[10px]">
                            {t.vehicleType}
                          </Badge>
                          <span className="text-xs text-slate-300 font-bold">
                            {t.passengersCount}/{t.totalSeats} seats
                          </span>
                        </div>
                      </td>

                      {/* Split Fare */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-amber-400">₹{t.fareAmount}</span>
                        <span className="text-[10px] text-slate-500 block">per seat</span>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Badge
                            variant={
                              t.status === 'completed'
                                ? 'success'
                                : t.status === 'in_progress'
                                ? 'brand'
                                : t.status === 'cancelled'
                                ? 'danger'
                                : 'warning'
                            }
                            className="capitalize text-[10px]"
                          >
                            {t.status}
                          </Badge>

                          {t.isHidden && (
                            <Badge variant="neutral" className="text-[9px] bg-slate-800 text-amber-300 flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" /> Hidden (Admin)
                            </Badge>
                          )}

                          {t.adminNotes && (
                            <Badge variant="warning" className="text-[9px] flex items-center gap-1 truncate max-w-[130px]">
                              <Edit3 className="w-2.5 h-2.5" /> Revision Sent
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions Toolbar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Inspect Manifest */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInspectTripId(t.id)}
                            title="Inspect complete passenger manifest & vehicle info"
                            leftIcon={<Eye className="w-3 h-3 text-sky-400" />}
                            className="text-[11px] py-1 px-2"
                          >
                            Inspect
                          </Button>

                          {/* 2. Hide / Unhide Toggle */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              visibilityMutation.mutate({ tripId: t.id, isHidden: !t.isHidden })
                            }
                            title={t.isHidden ? 'Restore to public search' : 'Hide from student search'}
                            leftIcon={
                              t.isHidden ? (
                                <Eye className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <EyeOff className="w-3 h-3 text-amber-400" />
                              )
                            }
                            className="text-[11px] py-1 px-2"
                          >
                            {t.isHidden ? 'Unhide' : 'Hide'}
                          </Button>

                          {/* 3. Request Changes */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRevisionModalTrip(t);
                              setRevisionNotes(t.adminNotes || '');
                            }}
                            title="Send revision advisory instructions to host"
                            leftIcon={<Edit3 className="w-3 h-3 text-amber-300" />}
                            className="text-[11px] py-1 px-2"
                          >
                            Advise
                          </Button>

                          {/* 4. Force Complete */}
                          {t.status !== 'completed' && t.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => forceCompleteMutation.mutate(t.id)}
                              title="Force complete ride"
                              leftIcon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              className="text-[11px] py-1 px-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                            >
                              Complete
                            </Button>
                          )}

                          {/* 5. Soft Cancel */}
                          {t.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCancelModalTrip(t)}
                              title="Soft cancel ride"
                              leftIcon={<XCircle className="w-3 h-3 text-rose-400" />}
                              className="text-[11px] py-1 px-2 border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                            >
                              Cancel
                            </Button>
                          )}

                          {/* 6. Hard Delete & Purge (Frees Memory) */}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteModalTrip(t)}
                            title="Permanently wipe trip and orphaned requests from database"
                            leftIcon={<Trash2 className="w-3 h-3" />}
                            className="text-[11px] py-1 px-2"
                          >
                            Purge
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} rides)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* 🔍 Sliding Deep Inspection Manifest Drawer */}
      {inspectTripId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 max-w-xl w-full h-full p-6 space-y-5 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sky-400" /> Deep Trip Manifest Inspection
                </h3>
                <span className="text-xs text-slate-400 font-mono">Trip ID: {inspectTripId}</span>
              </div>
              <button
                onClick={() => setInspectTripId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isManifestLoading && (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" text="Loading complete passenger & route manifest..." />
              </div>
            )}

            {!isManifestLoading && manifestData && (
              <div className="space-y-5 text-xs">
                {/* Route Overview */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>{manifestData.trip.source?.name}</span>
                    <span className="text-slate-500">➔</span>
                    <span>{manifestData.trip.destination?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date & Time</span>
                      <span>
                        {manifestData.trip.travelDate} at {manifestData.trip.departureTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Vehicle & Seats</span>
                      <span className="capitalize">
                        {manifestData.trip.vehicleType} ({manifestData.trip.availableSeats} of{' '}
                        {manifestData.trip.totalSeats} seats open)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Details */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-slate-400">
                    Host Student
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm block">
                        {manifestData.host.fullName}
                      </span>
                      <span className="text-slate-400">{manifestData.host.email}</span>
                      <span className="text-slate-500 block text-[10px] mt-0.5">
                        {manifestData.host.collegeName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold block text-sm">
                        {manifestData.host.trustScore} pts
                      </span>
                      <Badge variant="brand" className="text-[10px]">
                        {manifestData.host.verificationStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Passenger Manifest */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" /> Confirmed Passengers (
                    {manifestData.passengers.length})
                  </h4>

                  {manifestData.passengers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center bg-slate-950/60 rounded-xl border border-slate-800">
                      No passengers have joined this ride yet.
                    </p>
                  ) : (
                    manifestData.passengers.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block">{p.fullName}</span>
                          <span className="text-slate-400 text-[11px]">
                            Pickup: {p.pickupSpot || 'Campus Gate'} • Seats: {p.seatsRequested}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-mono font-bold block text-[11px]">
                            {p.trustScore} pts
                          </span>
                          <Badge
                            variant={p.status === 'accepted' ? 'success' : 'warning'}
                            className="text-[9px]"
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Host Notes & Admin Advisories */}
                {manifestData.trip.notes && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Host Notes:</span>
                    <p className="text-slate-300 italic">{manifestData.trip.notes}</p>
                  </div>
                )}

                {manifestData.trip.adminNotes && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">
                      Active Moderator Advisory:
                    </span>
                    <p className="text-amber-200">{manifestData.trip.adminNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📝 Request Changes (Host Advisory) Modal */}
      {revisionModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Request Ride Details Revision
              </h3>
              <button
                onClick={() => setRevisionModalTrip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Send an official in-app notice to{' '}
              <strong className="text-white">{revisionModalTrip.hostName}</strong> requesting corrections for the ride from{' '}
              <strong className="text-white">{revisionModalTrip.source}</strong> to{' '}
              <strong className="text-white">{revisionModalTrip.destination}</strong>:
            </p>

            {/* Quick Templates */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Advisory Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Please specify exact campus gate pickup point.',
                  'Departure time is in the past / unrealistic.',
                  'Fare split exceeds non-profit student carpool limit.',
                  'Vehicle registration details missing.',
                ].map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => setRevisionNotes(tmpl)}
                    className="text-[10px] bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-colors text-left"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Custom Revision Notes:</label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Explain the required corrections..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setRevisionModalTrip(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={requestChangesMutation.isPending || !revisionNotes.trim()}
                onClick={() =>
                  requestChangesMutation.mutate({
                    tripId: revisionModalTrip.id,
                    notes: revisionNotes,
                  })
                }
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                {requestChangesMutation.isPending ? 'Sending...' : 'Send Advisory Alert'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Permanent Hard Delete & Purge Modal (Frees Memory) */}
      {deleteModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" /> Permanently Delete & Purge Ride
              </h3>
              <button
                onClick={() => setDeleteModalTrip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5 text-xs text-rose-200">
              <span className="font-bold block flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4" /> Permanent Database Memory Cleanup
              </span>
              <p>
                This will completely remove the trip document from the MongoDB <code className="font-mono text-white">trips</code> collection and delete all associated orphaned booking requests to reclaim storage memory.
              </p>
            </div>

            <p className="text-xs text-slate-300">
              Target Ride: <strong className="text-white">{deleteModalTrip.source}</strong> ➔{' '}
              <strong className="text-white">{deleteModalTrip.destination}</strong> hosted by{' '}
              <strong className="text-white">{deleteModalTrip.hostName}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setDeleteModalTrip(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteModalTrip.id)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                {deleteMutation.isPending ? 'Purging...' : 'Permanently Delete Trip'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Force Cancel Trip Modal */}
      {cancelModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Soft Cancel Ride
              </h3>
              <button
                onClick={() => setCancelModalTrip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to administratively cancel the ride from{' '}
              <strong className="text-white">{cancelModalTrip.source}</strong> to{' '}
              <strong className="text-white">{cancelModalTrip.destination}</strong> hosted by{' '}
              <strong className="text-white">{cancelModalTrip.hostName}</strong>?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Administrative Reason:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain the safety, policy, or fraud violation..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setCancelModalTrip(null)}>
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                onClick={() =>
                  cancelMutation.mutate({ tripId: cancelModalTrip.id, reason: cancelReason })
                }
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
