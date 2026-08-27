import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  MapPin,
  Clock,
  Send,
  Info,
  ShieldCheck,
  CheckCircle2,
  Users,
  Compass,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Trip, MatchResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge, Avatar } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Select';
import { Select } from '../../components/ui/Select';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { formatTime } from '../../lib/utils';

export const MatchesExplorerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTripId = searchParams.get('tripId') || '';
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedMatchForBreakdown, setSelectedMatchForBreakdown] = useState<MatchResult | null>(null);
  const [connectionRecipient, setConnectionRecipient] = useState<{ tripId: string; userId: string; name: string } | null>(null);
  const [connectMessage, setConnectMessage] = useState('Hi! I saw we have compatible campus travel routes. Would love to travel together.');

  // 1. Fetch user's own trips for the selector dropdown
  const { data: myTrips, isLoading: myTripsLoading } = useQuery({
    queryKey: ['my-trips-for-matching'],
    queryFn: async () => {
      const res = await apiClient.get('/trips');
      return res.data.data as Trip[];
    },
  });

  const selectedTripId = activeTripId || (myTrips && myTrips.length > 0 ? myTrips[0].id : '');

  // 2. Fetch matches for selected trip
  const {
    data: matches,
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['matches-for-trip', selectedTripId],
    queryFn: async () => {
      if (!selectedTripId) return [];
      const res = await apiClient.get(`/matching/trips/${selectedTripId}/matches`);
      return res.data.data as MatchResult[];
    },
    enabled: !!selectedTripId,
  });

  // 3. Send Connection Request Mutation
  const sendConnectionMutation = useMutation({
    mutationFn: async ({ recipientId, tripId, message }: { recipientId: string; tripId: string; message: string }) => {
      await apiClient.post('/connections', {
        recipientId,
        tripId,
        message,
      });
    },
    onSuccess: () => {
      success('Request Sent', 'Co-travel request dispatched to student.');
      setConnectionRecipient(null);
      queryClient.invalidateQueries({ queryKey: ['connections-list'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to send request', err.message);
    },
  });

  if (myTripsLoading) return <LoadingSpinner size="lg" text="Loading match engine..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-indigo-400" /> 6-Factor Smart Matches
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Route overlap, departure time delta, transit type, and verified trust compatibility.
          </p>
        </div>

        {/* Trip Selector Dropdown */}
        {myTrips && myTrips.length > 0 && (
          <div className="w-full md:w-80">
            <Select
              label="Matching Target Trip"
              value={selectedTripId}
              onChange={(e) => setSearchParams({ tripId: e.target.value })}
              options={myTrips.map((t) => ({
                value: t.id,
                label: `${t.source.name} → ${t.destination.name} (${t.travelDate})`,
              }))}
            />
          </div>
        )}
      </div>

      {(!myTrips || myTrips.length === 0) && (
        <EmptyState
          title="No Published Trips to Match"
          description="Create a travel schedule first so our 6-factor matching engine can find compatible companions."
          actionLabel="Publish a Trip"
          onAction={() => window.location.assign('/trips/new')}
        />
      )}

      {selectedTripId && matchesLoading && <LoadingSpinner text="Computing 6-factor route compatibility..." />}
      {selectedTripId && matchesError && (
        <ErrorState message="Failed to calculate matches." onRetry={() => refetchMatches()} />
      )}

      {selectedTripId && !matchesLoading && !matchesError && (!matches || matches.length === 0) && (
        <EmptyState
          icon={<Compass className="w-7 h-7" />}
          title="No Compatible Trips Found Yet"
          description="We couldn't find active students on this route and time window right now. Try expanding your stops or date."
        />
      )}

      {/* Match Cards List */}
      {selectedTripId && !matchesLoading && !matchesError && matches && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m, idx) => {
            const matchedTrip = m.matchedTrip;
            const companion = matchedTrip.user;

            // Percentage color logic
            let scoreColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60 shadow-glow-trust';
            if (m.matchScore < 60) scoreColor = 'text-amber-400 border-amber-500/40 bg-amber-950/60';
            else if (m.matchScore < 80) scoreColor = 'text-indigo-400 border-indigo-500/40 bg-indigo-950/60 shadow-glow';

            return (
              <Card key={idx} hoverEffect className="glass-card flex flex-col justify-between p-5 space-y-4">
                <div className="space-y-4">
                  {/* Top Bar: Profile and Score badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={companion?.fullName || 'Student'}
                        src={companion?.avatarUrl}
                        size="md"
                        verified={companion?.verificationStatus === 'approved'}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          {companion?.fullName || 'College Traveler'}
                          {companion?.verificationStatus === 'approved' && (
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          )}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {companion?.collegeName || 'KIET'} • {companion?.academicYear ? `Year ${companion.academicYear}` : 'Student'}
                        </p>
                      </div>
                    </div>

                    {/* Match Score Display */}
                    <div className={`px-3 py-1.5 rounded-xl border text-center font-black text-sm shrink-0 ${scoreColor}`}>
                      {m.matchScore}%
                      <span className="block text-[9px] font-semibold tracking-wider uppercase opacity-80">Match</span>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{matchedTrip.source.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{matchedTrip.destination.name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(matchedTrip.departureTime)}
                      </span>
                      <span className="capitalize">{matchedTrip.transportType}</span>
                    </div>
                  </div>

                  {/* Reasons pills */}
                  {m.reasons && m.reasons.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Compatibility Highlights:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.reasons.map((reason, rIdx) => (
                          <span
                            key={rIdx}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust Score snippet */}
                  <div className="pt-2">
                    <TrustScoreMeter score={companion?.trustScore || 0} size="sm" />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Info className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedMatchForBreakdown(m)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Breakdown
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setConnectionRecipient({
                        tripId: matchedTrip.id,
                        userId: matchedTrip.userId,
                        name: companion?.fullName || 'Student',
                      })
                    }
                  >
                    Connect
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 6-Factor Score Breakdown Modal */}
      <Modal
        isOpen={!!selectedMatchForBreakdown}
        onClose={() => setSelectedMatchForBreakdown(null)}
        title="6-Factor Compatibility Breakdown"
        description="Deterministic scoring calculated from geospatial, temporal, and verified student metrics."
      >
        {selectedMatchForBreakdown && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-sm font-bold text-slate-200">Overall Match Score</span>
              <span className="text-xl font-black text-indigo-400">{selectedMatchForBreakdown.matchScore}%</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">1. Route & Spatial Overlap (35% weight)</span>
                <span className="font-bold text-emerald-400">
                  {selectedMatchForBreakdown.scoreBreakdown.routeOverlapScore}%
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">2. Departure Time Proximity (20% weight)</span>
                <span className="font-bold text-indigo-400">
                  {selectedMatchForBreakdown.scoreBreakdown.timeScore}%
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">3. Travel Date Exactness (15% weight)</span>
                <span className="font-bold text-slate-200">{selectedMatchForBreakdown.scoreBreakdown.dateScore}%</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">4. Transit Mode Compatibility (10% weight)</span>
                <span className="font-bold text-slate-200">
                  {selectedMatchForBreakdown.scoreBreakdown.transportScore}%
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">5. Personal Preferences (10% weight)</span>
                <span className="font-bold text-slate-200">
                  {selectedMatchForBreakdown.scoreBreakdown.preferenceScore}%
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">6. Student Trust & Verification (10% weight)</span>
                <span className="font-bold text-emerald-400">
                  {selectedMatchForBreakdown.scoreBreakdown.verificationScore}%
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Connection Request Modal */}
      <Modal
        isOpen={!!connectionRecipient}
        onClose={() => setConnectionRecipient(null)}
        title={`Connect with ${connectionRecipient?.name}`}
        description="Send an intro note to request travelling together on this route."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConnectionRecipient(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-3.5 h-3.5" />}
              isLoading={sendConnectionMutation.isPending}
              onClick={() => {
                if (connectionRecipient) {
                  sendConnectionMutation.mutate({
                    recipientId: connectionRecipient.userId,
                    tripId: connectionRecipient.tripId,
                    message: connectMessage,
                  });
                }
              }}
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
          />
        </div>
      </Modal>
    </div>
  );
};
