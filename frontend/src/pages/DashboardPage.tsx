import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  PlusCircle,
  Users,
  Shield,
  MapPin,
  Clock,
  ArrowRight,
  FileCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api.client';
import { Trip, Connection } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TrustScoreMeter } from '../components/ui/TrustScoreMeter';
import { EmptyState, ErrorState, LoadingSpinner } from '../components/ui/EmptyState';
import { formatTime } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();

  // Fetch upcoming trips for current user
  const {
    data: tripsData,
    isLoading: tripsLoading,
    isError: tripsError,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['my-trips-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/trips/me?limit=3');
      return res.data.data as Trip[];
    },
  });

  // Fetch pending connections count
  const { data: connectionsData } = useQuery({
    queryKey: ['pending-connections-count'],
    queryFn: async () => {
      const res = await apiClient.get('/connections/requests');
      return res.data.data as Connection[];
    },
  });

  const pendingRequestsCount = connectionsData?.length || 0;
  const isUnverified = profile?.verificationStatus !== 'approved';

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-900/50 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/85 px-2.5 py-1 rounded-full border border-indigo-500/30">
                {profile?.collegeName || 'KIET Campus Network'}
              </span>
              {profile?.verificationStatus === 'approved' && (
                <Badge variant="success" size="sm">
                  Verified Student
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Hello, {profile?.fullName || user?.email?.split('@')[0]} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Find compatible college commuters, split travel costs safely, and travel together with verified students.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link to="/trips/new" className="w-full sm:w-auto">
              <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />} className="w-full">
                Publish a Trip
              </Button>
            </Link>
            <Link to="/matches" className="w-full sm:w-auto">
              <Button variant="secondary" leftIcon={<Sparkles className="w-4 h-4 text-indigo-400" />} className="w-full">
                Find Matches
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient glow accent */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Verification Action Banner if unverified */}
      {isUnverified && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Student ID Verification Pending
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload your college ID card to unlock <strong className="text-emerald-400">+30 Trust Score</strong> and full group travel permissions.
              </p>
            </div>
          </div>
          <Link to="/verification" className="shrink-0 w-full sm:w-auto">
            <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-200 hover:bg-amber-950/60 w-full" leftIcon={<FileCheck className="w-4 h-4" />}>
              Verify Student ID
            </Button>
          </Link>
        </div>
      )}

      {/* Grid: Stats & Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trust Score Card */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">Trust & Reputation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TrustScoreMeter score={profile?.trustScore || 0} size="lg" />
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-base font-bold text-slate-100">{profile?.completedTripCount || 0}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Completed</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-base font-bold text-amber-400">★ {profile?.averageRating || '5.0'}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rating</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incoming Connection Requests */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-300">Travel Requests</CardTitle>
              {pendingRequestsCount > 0 && <Badge variant="warning">{pendingRequestsCount} pending</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-400">
              {pendingRequestsCount > 0
                ? `You have ${pendingRequestsCount} co-travel requests waiting for confirmation.`
                : 'No pending co-travel requests right now.'}
            </p>
            <Link to="/connections">
              <Button size="sm" variant="secondary" className="w-full mt-2" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Connection Hub
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Safety Hub */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> Safety & Emergency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-400">
              Register up to 5 emergency contacts and access instantaneous SOS dispatch with GPS coordinates.
            </p>
            <Link to="/safety">
              <Button size="sm" variant="outline" className="w-full mt-2" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Safety & SOS Center
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active & Upcoming Trips Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" /> Active & Upcoming Trips
          </h3>
          <Link to="/trips" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            View All Trips →
          </Link>
        </div>

        {tripsLoading && <LoadingSpinner text="Fetching campus trips..." />}
        {tripsError && <ErrorState message="Failed to load your trips." onRetry={() => refetchTrips()} />}

        {!tripsLoading && !tripsError && (!tripsData || tripsData.length === 0) && (
          <EmptyState
            title="No Active Trips Published"
            description="You haven't scheduled any upcoming travel yet. Publish a trip to find verified college companions."
            actionLabel="Schedule Your First Trip"
            onAction={() => window.location.assign('/trips/new')}
          />
        )}

        {!tripsLoading && !tripsError && tripsData && tripsData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tripsData.map((trip) => (
              <Card key={trip.id} hoverEffect className="glass-card flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="brand" size="sm">
                      {trip.transportType.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-400">{trip.travelDate}</span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{trip.source.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{trip.destination.name}</span>
                    </div>
                  </div>

                  {trip.departureTime && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Departure: {formatTime(trip.departureTime)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 capitalize">{trip.status}</span>
                  <Link to={`/trips/${trip.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs p-0 text-indigo-400 hover:bg-transparent">
                      Details →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
