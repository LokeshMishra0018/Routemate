import React, { useState } from 'react';
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
  Send,
  User,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trip, Connection } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Select';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { LoadingSpinner, ErrorState } from '../../components/ui/EmptyState';
import { formatTime, formatIndianCurrency } from '../../lib/utils';

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectMessage, setConnectMessage] = useState('Hi! I saw your campus route and would love to travel together.');

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${id}`);
      return res.data.data as Trip;
    },
    enabled: !!id,
  });

  // Fetch connections to mark connected trips
  const { data: connections } = useQuery({
    queryKey: ['all-connections', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/connections');
      return res.data.data as Connection[];
    },
    enabled: !!user?.id,
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

  const sendConnectionMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/connections', {
        recipientId: trip?.userId,
        tripId: trip?.id,
        message: connectMessage.trim() || undefined,
      });
    },
    onSuccess: () => {
      success('Co-Travel Request Sent', `Request sent to ${traveler?.fullName || 'the student'}. You can track status in your Connection Hub.`);
      setIsConnectOpen(false);
      queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      queryClient.invalidateQueries({ queryKey: ['all-connections'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Could not send request', err.message);
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: 'accepted' | 'rejected' }) => {
      await apiClient.patch(`/connections/${connectionId}`, { status });
    },
    onSuccess: (_, variables) => {
      success(
        variables.status === 'accepted' ? 'Connection Accepted' : 'Connection Declined',
        variables.status === 'accepted' ? 'Co-traveler joined your trip! 1 seat reserved.' : 'Request dismissed.'
      );
      queryClient.invalidateQueries({ queryKey: ['trip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['all-connections'] });
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to update request', err.message);
    },
  });

  if (isLoading) return <LoadingSpinner size="lg" text="Loading route details..." />;
  if (isError || !trip) return <ErrorState message="Could not load trip details." onRetry={() => refetch()} />;

  const isOwner = user?.id === trip.userId;
  const traveler = (trip as any).user || (trip as any).creator;

  const bookedSeats = connections ? connections.filter((c) => c.tripId === trip.id && c.status === 'accepted').length : 0;
  const remainingSeats = Math.max(0, (trip.availableSeats ?? 1) - bookedSeats);

  const tripAcceptedConnections = isOwner && connections ? connections.filter(
    (c) => c.tripId === trip.id && c.status === 'accepted'
  ) : [];

  const tripPendingConnections = isOwner && connections ? connections.filter(
    (c) => c.tripId === trip.id && c.status === 'pending' && c.recipientId === user?.id
  ) : [];

  const connection = !isOwner && connections ? connections.find(
    (c) =>
      (c.tripId && c.tripId === trip.id) ||
      (c.requesterId === trip.userId && c.recipientId === user?.id) ||
      (c.requesterId === user?.id && c.recipientId === trip.userId)
  ) : null;

  const isConnected = connection?.status === 'accepted';
  const isPending = connection?.status === 'pending';
  const isOutgoingPending = isPending && connection?.requesterId === user?.id;
  const isIncomingPending = isPending && connection?.recipientId === user?.id;

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
          {isConnected && (
            <Badge variant="success" size="sm" className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Connected
            </Badge>
          )}
          {isOutgoingPending && (
            <Badge variant="warning" size="sm" className="bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Request Sent
            </Badge>
          )}
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
            {isOwner ? (
              <>
                <Link to={`/matches?tripId=${trip.id}`}>
                  <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                    Find Companions
                  </Button>
                </Link>
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
              </>
            ) : isConnected ? (
              <Link to="/messages">
                <Button
                  variant="primary"
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-glow"
                >
                  Message Buddy
                </Button>
              </Link>
            ) : isOutgoingPending ? (
              <Link to="/connections">
                <Button
                  variant="secondary"
                  leftIcon={<Clock className="w-4 h-4 text-amber-400" />}
                  className="text-amber-300 border-amber-500/30"
                >
                  Request Sent (Pending)
                </Button>
              </Link>
            ) : isIncomingPending ? (
              <Link to="/connections">
                <Button
                  variant="primary"
                  leftIcon={<CheckCircle className="w-4 h-4 text-white" />}
                  className="bg-indigo-600 shadow-glow"
                >
                  Accept Co-Travel Invite
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={() => setIsConnectOpen(true)}
                className="shadow-glow"
              >
                Request Co-Travel
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
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{remainingSeats} Open</span>
              {bookedSeats > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400">({bookedSeats} booked)</span>
              )}
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

        {/* Additional Trip Notes */}
        {trip.notes && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300">
            <span className="font-bold text-slate-400 block mb-1">Route Notes:</span>
            <p>{trip.notes}</p>
          </div>
        )}
      </Card>

      {/* Owner View: Confirmed Co-Travelers & Pending Requests */}
      {isOwner && (
        <div className="space-y-4">
          {/* Confirmed Roster */}
          <Card className="glass-card p-6 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" /> Confirmed Co-Travelers
                </h3>
                <p className="text-xs text-slate-400">
                  {tripAcceptedConnections.length > 0
                    ? `${tripAcceptedConnections.length} student companion${tripAcceptedConnections.length > 1 ? 's' : ''} connected for this trip.`
                    : 'No co-travelers joined yet.'}
                </p>
              </div>
              <Badge variant={remainingSeats > 0 ? 'brand' : 'neutral'}>
                {remainingSeats} {remainingSeats === 1 ? 'Seat' : 'Seats'} Remaining
              </Badge>
            </div>

            {tripAcceptedConnections.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                <span>No companions have booked a seat yet. Share your trip route or invite matches to co-travel!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {tripAcceptedConnections.map((conn) => {
                  const companion = conn.requesterId === user?.id ? conn.recipient : conn.requester;
                  return (
                    <div
                      key={conn.id}
                      className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={companion?.fullName || 'Traveler'}
                          src={companion?.avatarUrl}
                          size="md"
                          verified={companion?.verificationStatus === 'approved'}
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                            {companion?.fullName || 'Student Companion'}
                            {companion?.verificationStatus === 'approved' && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </h4>
                          <span className="text-[11px] text-slate-400 block">
                            {companion?.collegeName || 'KIET'} • ★ {companion?.averageRating || '5.0'}
                          </span>
                        </div>
                      </div>

                      <Link to="/messages">
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 shadow-glow"
                        >
                          Message
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pending Requests on this Trip */}
          {tripPendingConnections.length > 0 && (
            <Card className="glass-card p-6 border-amber-500/30 bg-amber-950/10 space-y-4">
              <div className="border-b border-amber-500/20 pb-3">
                <h3 className="text-base font-bold text-amber-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Pending Join Requests ({tripPendingConnections.length})
                </h3>
                <p className="text-xs text-slate-400">
                  These students have requested a seat on your journey.
                </p>
              </div>

              <div className="space-y-3">
                {tripPendingConnections.map((conn) => (
                  <div
                    key={conn.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={conn.requester?.fullName || 'Traveler'}
                        src={conn.requester?.avatarUrl}
                        size="md"
                        verified={conn.requester?.verificationStatus === 'approved'}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">
                            {conn.requester?.fullName || 'Student'}
                          </span>
                          <Badge variant="brand" size="sm">
                            Trust: {conn.requester?.trustScore || 50}
                          </Badge>
                        </div>
                        {conn.message && (
                          <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                            "{conn.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={updateConnectionMutation.isPending}
                        onClick={() => updateConnectionMutation.mutate({ connectionId: conn.id, status: 'accepted' })}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 shadow-glow"
                      >
                        Accept Seat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={updateConnectionMutation.isPending}
                        onClick={() => updateConnectionMutation.mutate({ connectionId: conn.id, status: 'rejected' })}
                        className="text-xs text-red-400 hover:bg-red-950/30"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Traveler Profile Card */}
      {!isOwner && traveler && (
        <Card className="glass-card p-6 border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Avatar
                name={traveler.fullName || 'Traveler'}
                src={traveler.avatarUrl}
                size="lg"
                verified={traveler.verificationStatus === 'approved'}
              />
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  {traveler.fullName || 'Campus Traveler'}
                  {traveler.verificationStatus === 'approved' && (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {traveler.collegeName || 'KIET'} • {traveler.academicYear ? `Year ${traveler.academicYear}` : 'Student Member'}
                </p>
              </div>
            </div>

            {isConnected ? (
              <Link to="/messages">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-glow"
                >
                  Message {traveler.fullName?.split(' ')[0] || 'Buddy'}
                </Button>
              </Link>
            ) : isOutgoingPending ? (
              <Link to="/connections">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Clock className="w-4 h-4 text-amber-400" />}
                  className="text-amber-300 border-amber-500/30"
                >
                  Request Pending
                </Button>
              </Link>
            ) : isIncomingPending ? (
              <Link to="/connections">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle className="w-4 h-4 text-white" />}
                  className="bg-indigo-600 shadow-glow"
                >
                  Accept Request
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={() => setIsConnectOpen(true)}
              >
                Connect with {traveler.fullName?.split(' ')[0] || 'Traveler'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Trust & Verification
              </span>
              <TrustScoreMeter score={traveler.trustScore || 0} size="sm" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Peer Rating
                </span>
                <span className="text-base font-bold text-amber-400">★ {traveler.averageRating || '5.0'}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Completed
                </span>
                <span className="text-base font-bold text-slate-100">{traveler.completedTripCount || 0} trips</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Gender Preference
              </span>
              <Badge variant={trip.preferences?.genderPreference === 'same_gender' ? 'warning' : 'neutral'} size="sm">
                {trip.preferences?.genderPreference === 'same_gender' ? 'Same Gender Only' : 'Any Gender Welcome'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Send Co-Travel Request Modal */}
      <Modal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        title={`Travel with ${traveler?.fullName || 'Companion'}`}
        description={`Send a co-travel request to join the journey from ${trip.source.name} to ${trip.destination.name}.`}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsConnectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-3.5 h-3.5" />}
              isLoading={sendConnectionMutation.isPending}
              onClick={() => sendConnectionMutation.mutate()}
            >
              Send Request
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <Textarea
            label="Intro Message"
            value={connectMessage}
            onChange={(e) => setConnectMessage(e.target.value)}
            rows={3}
            required
            placeholder="Introduce yourself and mention your boarding point..."
          />
          <p className="text-[11px] text-slate-400">
            Once the student accepts your request, a shared conversation and co-travel coordinates will open in your Connection Hub.
          </p>
        </div>
      </Modal>
    </div>
  );
};
