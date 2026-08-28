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
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdminTripItem, PaginatedResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export const AdminTripsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModalTrip, setCancelModalTrip] = useState<AdminTripItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<AdminTripItem>>({
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

  const cancelMutation = useMutation({
    mutationFn: async ({ tripId, reason }: { tripId: string; reason: string }) => {
      const res = await apiClient.post(`/admin/trips/${tripId}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Trip Cancelled', message: 'The trip was cancelled by administrator.' });
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

  const trips = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-indigo-400" /> Trips Master Dispatch Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete campus ride operations registry, in-transit status, seat occupancy, and emergency cancellation controls.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300">
          <Car className="w-4 h-4 text-indigo-400" /> {pagination.totalCount} Total Rides Logged
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
            <option value="planned">Planned 🕒</option>
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
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Trip Route</th>
                  <th className="py-3 px-4">Host Student</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Mode / Seats</th>
                  <th className="py-3 px-4">Split Fare</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{t.hostName}</div>
                        <div className="text-[11px] text-slate-400">{t.hostEmail}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {t.travelDate}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {t.departureTime}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" className="capitalize text-[10px]">
                            {t.vehicleType}
                          </Badge>
                          <span className="text-xs text-slate-300 font-bold">
                            {t.passengersCount}/{t.totalSeats} seats
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-black text-amber-400">₹{t.fareAmount}</span>
                        <span className="text-[10px] text-slate-500 block">per seat</span>
                      </td>

                      <td className="py-3 px-4">
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
                      </td>

                      <td className="py-3 px-4 text-right">
                        {t.status !== 'cancelled' && t.status !== 'completed' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setCancelModalTrip(t)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Cancel Trip
                          </Button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">No Actions</span>
                        )}
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

      {/* Force Cancel Trip Modal */}
      {cancelModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Force Cancel Ride
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
