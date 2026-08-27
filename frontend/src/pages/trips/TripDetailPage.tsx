import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  Users,
  DollarSign,
  Sparkles,
  ArrowLeft,
  Trash2,
  Share2,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trip } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { LoadingSpinner, ErrorState } from '../../components/ui/EmptyState';
import { formatTime, formatIndianCurrency } from '../../lib/utils';

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${id}`);
      return res.data.data as Trip;
    },
    enabled: !!id,
  });

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/trips/${id}`);
    },
    onSuccess: () => {
      success('Trip Cancelled', 'Your scheduled trip has been removed.');
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      navigate('/trips');
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to cancel trip', err.message);
    },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading route details..." />;
  if (isError || !trip) return <ErrorState message="Could not load trip details." onRetry={() => refetch()} />;

  const isOwner = user?.id === trip.userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/trips"
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Trips
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="brand">{trip.transportType.toUpperCase()}</Badge>
          <Badge variant="neutral" className="capitalize">
            {trip.status}
          </Badge>
        </div>
      </div>

      {/* Hero Route Card */}
      <Card className="glass-panel border-slate-700 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Confirmed Campus Route
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 flex-wrap">
              <span>{trip.source.name}</span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-400">{trip.destination.name}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/matches?tripId=${trip.id}`}>
              <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                Find Companions
              </Button>
            </Link>
            {isOwner && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this trip?')) {
                    deleteTripMutation.mutate();
                  }
                }}
                isLoading={deleteTripMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stops Timeline */}
        {trip.stops && trip.stops.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Transit Stops & Waypoints
            </span>
            <div className="flex flex-col gap-2 pt-1">
              {trip.stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-100">{stop.name}</span>
                  {stop.estimatedArrivalTime && (
                    <span className="text-slate-400">({formatTime(stop.estimatedArrivalTime)})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule & Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Travel Date</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>{trip.travelDate}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Departure</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{formatTime(trip.departureTime) || 'Flexible'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Available Seats</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <Users className="w-4 h-4 text-amber-400" />
              <span>{trip.availableSeats || 1} Open</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Cost Sharing</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>
                {trip.costSharing?.enabled && trip.costSharing.estimatedTotalCost
                  ? formatIndianCurrency(trip.costSharing.estimatedTotalCost)
                  : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
