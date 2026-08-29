import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Filter,
  ShieldCheck,
  Send,
  Sparkles,
  User,
  Compass,
  CheckCircle,
  MessageSquare,
  Search,
  X,
  SlidersHorizontal,
  Navigation,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { calculateHaversineKm } from '../../services/routing.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api.client';
import { Trip, Connection } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge, Avatar } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { formatTime, formatIndianCurrency } from '../../lib/utils';

export const TripsListPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'deleted' | 'peers'>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('');
  const [selectedHotspot, setSelectedHotspot] = useState<string>('');
  const [transportFilter, setTransportFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [onlyOpenSeats, setOnlyOpenSeats] = useState<boolean>(false);
  const [onlyCostShare, setOnlyCostShare] = useState<boolean>(false);
  const [deleteModalTrip, setDeleteModalTrip] = useState<Trip | null>(null);

  const currentUserId = user?.id || profile?.userId;

  // Delete Trip Mutation
  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiClient.delete(`/trips/${tripId}`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Trip Deleted',
        message: 'Your trip has been moved to Deleted Trips and removed from public search.',
      });
      setDeleteModalTrip(null);
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-trips-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-trips-dashboard'] });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Failed to Delete Trip',
        message: err.response?.data?.error?.message || 'Could not delete trip. Please try again.',
      });
    },
  });

  // Restore Trip Mutation for Host
  const restoreTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiClient.post(`/trips/${tripId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Trip Restored',
        message: 'Your trip has been reactivated and is now visible in campus search.',
      });
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-trips-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-trips-dashboard'] });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Failed to Restore Trip',
        message: err.response?.data?.error?.message || 'Could not restore trip. Please try again.',
      });
    },
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedSearchQuery(searchInput.trim());
    setSelectedHotspot('');
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearchQuery('');
    setSelectedHotspot('');
  };

  // 1. Fetch public active trips
  const { data: trips, isLoading: isTripsLoading, isError: isTripsError, refetch } = useQuery({
    queryKey: ['trips-list', transportFilter, dateFilter, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('includeMyTrips', 'true');
      params.append('excludeMe', 'false');
      if (transportFilter) params.append('transportType', transportFilter);
      if (dateFilter) {
        params.append('travelDate', dateFilter);
        params.append('date', dateFilter);
      }

      const res = await apiClient.get(`/trips?${params.toString()}`);
      return res.data.data as Trip[];
    },
  });

  // 2. Fetch all current user's trips (Active + Deleted/Cancelled)
  const { data: myTripsData, isLoading: isMyTripsLoading } = useQuery({
    queryKey: ['my-trips-list', currentUserId],
    queryFn: async () => {
      const res = await apiClient.get('/trips/me?pageSize=50');
      return res.data.data as Trip[];
    },
    enabled: !!currentUserId,
  });

  // 3. Fetch connections to mark connected trips
  const { data: connections } = useQuery({
    queryKey: ['all-connections', currentUserId],
    queryFn: async () => {
      const res = await apiClient.get('/connections');
      return res.data.data as Connection[];
    },
    enabled: !!currentUserId,
  });

  const checkIsMyTrip = (trip: any) => {
    if (!currentUserId) return false;
    if (trip.userId === currentUserId) return true;
    if (trip.user && (trip.user.id === currentUserId || trip.user.userId === currentUserId)) return true;
    if (trip.creator && (trip.creator.id === currentUserId || trip.creator.userId === currentUserId)) return true;
    return false;
  };

  const getConnectionForTrip = (trip: any) => {
    if (!currentUserId || !connections) return null;
    return connections.find(
      (c) =>
        c.tripId === trip.id &&
        (c.requesterId === currentUserId || c.recipientId === currentUserId)
    );
  };

  const myAllTrips = myTripsData || [];
  const activeMyTrips = myAllTrips.filter((t: any) => !t.isDeleted && t.status !== 'cancelled');
  const deletedMyTrips = myAllTrips.filter((t: any) => t.isDeleted || t.status === 'cancelled');

  // Filter based on active tab & search query & feature toggles
  const filteredTrips = useMemo(() => {
    let sourcePool: any[] = [];
    if (activeTab === 'deleted') {
      sourcePool = deletedMyTrips;
    } else if (activeTab === 'mine') {
      sourcePool = activeMyTrips;
    } else if (activeTab === 'peers') {
      sourcePool = (trips || []).filter((t) => !checkIsMyTrip(t));
    } else {
      sourcePool = trips || [];
    }

    return sourcePool.filter((trip: any) => {
      const traveler = trip.user || trip.creator;
      const bookedSeats = connections?.filter((c) => c.tripId === trip.id && c.status === 'accepted').length || 0;
      const openSeats = Math.max(0, (trip.availableSeats ?? 1) - bookedSeats);

      // 1. Open seats filter
      if (onlyOpenSeats && openSeats <= 0) return false;

      // 2. Cost share filter
      if (onlyCostShare && (!trip.costSharing?.enabled || !trip.costSharing?.estimatedTotalCost)) return false;

      // 3. Hotspot / Keyword search
      const effectiveSearch = (appliedSearchQuery || selectedHotspot).trim().toLowerCase();
      if (effectiveSearch) {
        const sourceMatch = trip.source?.name?.toLowerCase().includes(effectiveSearch);
        const destMatch = trip.destination?.name?.toLowerCase().includes(effectiveSearch);
        const notesMatch = trip.notes?.toLowerCase().includes(effectiveSearch);
        const travelerMatch = traveler?.fullName?.toLowerCase().includes(effectiveSearch);
        const stopsMatch = trip.stops?.some((s: any) => s.name?.toLowerCase().includes(effectiveSearch));

        if (!sourceMatch && !destMatch && !notesMatch && !travelerMatch && !stopsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [trips, myTripsData, activeTab, onlyOpenSeats, onlyCostShare, appliedSearchQuery, selectedHotspot, connections, currentUserId]);

  const allCount = trips?.length || 0;
  const myTripsCount = activeMyTrips.length;
  const deletedCount = deletedMyTrips.length;
  const peersCount = (trips || []).filter((t) => !checkIsMyTrip(t)).length;

  const isLoading = isTripsLoading || (activeTab === 'mine' && isMyTripsLoading) || (activeTab === 'deleted' && isMyTripsLoading);
  const isError = isTripsError;

  const hasActiveFilters = Boolean(
    appliedSearchQuery || selectedHotspot || transportFilter || dateFilter || onlyOpenSeats || onlyCostShare
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearchQuery('');
    setSelectedHotspot('');
    setTransportFilter('');
    setDateFilter('');
    setOnlyOpenSeats(false);
    setOnlyCostShare(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Create CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-indigo-400" /> Campus Trips
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse, search, and coordinate student travel schedules across trains, buses, cabs, and campus routes.
          </p>
        </div>
        <Link to="/trips/new" className="w-full sm:w-auto">
          <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />} className="w-full shadow-glow">
            Schedule Trip
          </Button>
        </Link>
      </div>

      {/* Search & Discovery Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        {/* Main Search Input & Mode/Date Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Universal Search Input with Clickable Search Action */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-6 relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-indigo-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search origin, destination, stops, or peers..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                variant="primary"
                className="px-3 py-1 text-xs h-7 bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-1 shrink-0"
              >
                <Search className="w-3 h-3" /> Search
              </Button>
            </div>
          </form>

          {/* Transport Filter */}
          <div className="md:col-span-3">
            <Select
              value={transportFilter}
              onChange={(e) => setTransportFilter(e.target.value)}
              options={[
                { value: '', label: 'All Modes' },
                { value: 'train', label: '🚆 Train' },
                { value: 'bus', label: '🚌 Bus' },
                { value: 'cab', label: '🚖 Cab / Rideshare' },
                { value: 'personal_vehicle', label: '🚗 Personal Vehicle' },
                { value: 'flight', label: '✈️ Flight' },
              ]}
            />
          </div>

          {/* Travel Date Filter */}
          <div className="md:col-span-3">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Date"
            />
          </div>
        </div>

        {/* Quick Campus Hotspot Chips & Feature Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> Hotspots:
            </span>
            {[
              'Anand Vihar',
              'New Delhi',
              'Sector 62',
              'Ghaziabad Jn',
              'Gate 1',
              'Vivekanand',
              'Chanakya',
            ].map((hotspot) => {
              const isSelected = selectedHotspot.toLowerCase() === hotspot.toLowerCase() || appliedSearchQuery.toLowerCase() === hotspot.toLowerCase();
              return (
                <button
                  key={hotspot}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedHotspot('');
                      setAppliedSearchQuery('');
                      setSearchInput('');
                    } else {
                      setSelectedHotspot(hotspot);
                      setAppliedSearchQuery(hotspot);
                      setSearchInput(hotspot);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow'
                      : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  📍 {hotspot}
                </button>
              );
            })}
          </div>

          {/* Feature Toggles (Cost Share & Open Seats) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyCostShare(!onlyCostShare)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                onlyCostShare
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-glow'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <DollarSign className="w-3 h-3 text-emerald-300" /> Cost Sharing
            </button>

            <button
              onClick={() => setOnlyOpenSeats(!onlyOpenSeats)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                onlyOpenSeats
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <Users className="w-3 h-3 text-indigo-300" /> Open Seats Only
            </button>
          </div>
        </div>

        {/* View Tabs & Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Routes ({allCount})
              </button>
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'mine'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-300" /> My Trips ({myTripsCount})
              </button>
              <button
                onClick={() => setActiveTab('deleted')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'deleted'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trash2 className="w-3 h-3 text-rose-300" /> Deleted Trips ({deletedCount})
              </button>
              <button
                onClick={() => setActiveTab('peers')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'peers'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Campus Peers ({peersCount})
              </button>
            </div>

            <span className="text-xs text-slate-400 hidden sm:inline ml-2">
              Showing <strong className="text-slate-200">{filteredTrips.length}</strong> matching {filteredTrips.length === 1 ? 'route' : 'routes'}
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Trips Content */}
      {isLoading && <LoadingSpinner text="Loading campus routes..." />}
      {isError && <ErrorState message="Could not fetch trips list." onRetry={() => refetch()} />}

      {!isLoading && !isError && (!filteredTrips || filteredTrips.length === 0) && (
        <EmptyState
          title={
            hasActiveFilters
              ? 'No Matching Routes Found'
              : activeTab === 'deleted'
              ? 'No Deleted Trips'
              : activeTab === 'mine'
              ? 'No Published Trips Yet'
              : 'No Routes Available'
          }
          description={
            hasActiveFilters
              ? `No routes match "${appliedSearchQuery || selectedHotspot || 'your filters'}". Try clearing your search or filters.`
              : activeTab === 'deleted'
              ? 'You have no cancelled or deleted trips in your account history.'
              : activeTab === 'mine'
              ? "You haven't scheduled any upcoming trips yet. Publish a route to find student travel buddies."
              : 'Try adjusting your date or transport filters, or schedule a new trip to start matching.'
          }
          actionLabel={hasActiveFilters ? 'Clear Search & Filters' : activeTab === 'deleted' ? 'View My Active Trips' : 'Publish a New Trip'}
          onAction={hasActiveFilters ? handleResetFilters : activeTab === 'deleted' ? () => setActiveTab('mine') : () => window.location.assign('/trips/new')}
        />
      )}

      {!isLoading && !isError && filteredTrips && filteredTrips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrips.map((trip: any) => {
            const isMyTrip = checkIsMyTrip(trip);
            const traveler = trip.user || trip.creator;
            const myTripAcceptedCompanions = isMyTrip && connections ? connections.filter(c => c.tripId === trip.id && c.status === 'accepted') : [];
            const bookedSeats = connections?.filter(c => c.tripId === trip.id && c.status === 'accepted').length || 0;
            const openSeats = Math.max(0, (trip.availableSeats ?? 1) - bookedSeats);
            const connection = !isMyTrip ? getConnectionForTrip(trip) : null;
            const isConnected = connection?.status === 'accepted';
            const isPending = connection?.status === 'pending';
            const isOutgoingPending = isPending && connection?.requesterId === currentUserId;
            const isIncomingPending = isPending && connection?.recipientId === currentUserId;

            return (
              <Card
                key={trip.id}
                hoverEffect
                className={`glass-card flex flex-col justify-between p-5 space-y-4 transition-all ${
                  isMyTrip
                    ? 'border-indigo-500/50 bg-indigo-950/20 shadow-glow'
                    : isConnected
                    ? 'border-emerald-500/40 bg-emerald-950/15 shadow-glow'
                    : ''
                }`}
              >
                <div className="space-y-3.5">
                  {/* Traveler Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        name={isMyTrip ? user?.fullName || 'You' : traveler?.fullName || 'Traveler'}
                        src={isMyTrip ? user?.avatarUrl : traveler?.avatarUrl}
                        size="sm"
                        verified={isMyTrip ? user?.verificationStatus === 'approved' : traveler?.verificationStatus === 'approved'}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1 truncate">
                          <span>{isMyTrip ? `${user?.fullName || 'Your Schedule'} (You)` : traveler?.fullName || 'Campus Traveler'}</span>
                          <TrustBadge
                            tier={isMyTrip ? (profile?.verificationTier || (user?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')) : (traveler?.verificationTier || (traveler?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified'))}
                            iconOnly
                            size="xs"
                          />
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {isMyTrip ? user?.collegeName || 'KIET' : traveler?.collegeName || 'KIET'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="brand" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">
                        {trip.transportType}
                      </Badge>
                    </div>
                  </div>

                  {/* Status / Ownership Banner Strip */}
                  {isMyTrip ? (
                    (trip.isDeleted || trip.status === 'cancelled') ? (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          {trip.isDeleted ? 'Deleted by You' : 'Cancelled Trip'}
                        </span>
                        <span className="text-slate-400 text-[11px]">Inactive in Search</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-indigo-300">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          My Active Trip
                        </span>
                        {myTripAcceptedCompanions.length > 0 ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40 text-[11px]">
                            <Users className="w-3 h-3 text-emerald-400" /> {myTripAcceptedCompanions.length} {myTripAcceptedCompanions.length === 1 ? 'Buddy' : 'Buddies'} Joined
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Looking for buddies</span>
                        )}
                      </div>
                    )
                  ) : isConnected ? (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Connected Co-Traveler
                      </span>
                      <span className="text-[11px] text-emerald-400/80 font-medium">Ready to travel</span>
                    </div>
                  ) : isOutgoingPending ? (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Request Sent
                      </span>
                      <span className="text-[11px] text-amber-400/80 font-medium">Pending Approval</span>
                    </div>
                  ) : isIncomingPending ? (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                      <span className="flex items-center gap-1.5 font-semibold">
                        📩 Received Co-Travel Invite
                      </span>
                      <span className="text-[11px] text-amber-400/80 font-bold">Action Needed</span>
                    </div>
                  ) : null}

                  {/* Travel Date badge */}
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Travel Date:</span>
                    <span className="font-bold text-slate-100">{trip.travelDate}</span>
                  </div>

                  {/* Source & Destination */}
                  <div className="space-y-2 text-left bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Origin</span>
                        <span className="text-xs font-bold text-slate-100">{trip.source.name}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Destination</span>
                        <span className="text-xs font-bold text-slate-100">{trip.destination.name}</span>
                      </div>
                    </div>

                    {(() => {
                      const srcCoords = trip.source?.coordinates?.coordinates;
                      const dstCoords = trip.destination?.coordinates?.coordinates;
                      if (!srcCoords || !dstCoords) return null;
                      const dist = calculateHaversineKm(srcCoords[1], srcCoords[0], dstCoords[1], dstCoords[0]);
                      if (!dist || dist <= 0) return null;

                      return (
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 text-slate-400">
                          <span className="flex items-center gap-1 text-sky-400 font-medium font-mono">
                            <Navigation className="w-3 h-3" /> ~{dist} km
                          </span>
                          {trip.stops && trip.stops.length > 0 && (
                            <span className="text-slate-400">
                              {trip.stops.length} pickup stop{trip.stops.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Trip meta */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-400">
                    {trip.departureTime && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(trip.departureTime)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-200 font-medium">{openSeats} seats open</span>
                      {bookedSeats > 0 && (
                        <span className="text-[10px] text-emerald-400 font-semibold">({bookedSeats} booked)</span>
                      )}
                    </div>
                  </div>

                  {/* Cost Sharing pill */}
                  {trip.costSharing?.enabled && trip.costSharing.estimatedTotalCost && (
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Cost Share
                      </span>
                      <span className="font-bold">
                        {formatIndianCurrency(trip.costSharing.estimatedTotalCost)} total
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {isMyTrip ? (
                    (trip.isDeleted || trip.status === 'cancelled') ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => restoreTripMutation.mutate(trip.id)}
                        isLoading={restoreTripMutation.isPending}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 font-bold shadow-glow"
                      >
                        Restore Trip to Active
                      </Button>
                    ) : (
                      <>
                        <Link to={`/trips/${trip.id}`} className="flex-1">
                          <Button size="sm" variant="ghost" className="w-full text-xs text-slate-300 hover:text-white border border-slate-800">
                            Manage
                          </Button>
                        </Link>
                        {myTripAcceptedCompanions.length > 0 ? (
                          <Link to="/messages" className="flex-1">
                            <Button size="sm" variant="primary" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 shadow-glow">
                              Chat ({myTripAcceptedCompanions.length})
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/matches?tripId=${trip.id}`} className="flex-1">
                            <Button size="sm" variant="primary" leftIcon={<Sparkles className="w-3.5 h-3.5" />} className="w-full text-xs shadow-glow">
                              Matches
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteModalTrip(trip)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-2 border border-rose-500/20 shrink-0"
                          title="Delete Trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )
                  ) : isConnected ? (
                    <>
                      <Link to={`/trips/${trip.id}`} className="flex-1">
                        <Button size="sm" variant="ghost" className="w-full text-xs text-slate-300 hover:text-white border border-slate-800">
                          Details
                        </Button>
                      </Link>
                      <Link to="/messages" className="flex-1">
                        <Button size="sm" variant="primary" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 shadow-glow">
                          Message
                        </Button>
                      </Link>
                    </>
                  ) : isOutgoingPending ? (
                    <>
                      <Link to={`/trips/${trip.id}`} className="flex-1">
                        <Button size="sm" variant="ghost" className="w-full text-xs text-slate-300 hover:text-white border border-slate-800">
                          Details
                        </Button>
                      </Link>
                      <Badge variant="warning" className="flex-1 text-center justify-center py-2 text-xs">
                        Requested ⏳
                      </Badge>
                    </>
                  ) : isIncomingPending ? (
                    <>
                      <Link to="/connections" className="w-full">
                        <Button size="sm" variant="primary" className="w-full text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-glow">
                          Respond to Request 🔥
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={`/trips/${trip.id}`} className="flex-1">
                        <Button size="sm" variant="ghost" className="w-full text-xs text-slate-300 hover:text-white border border-slate-800">
                          Details
                        </Button>
                      </Link>
                      <Link to={`/trips/${trip.id}`} className="flex-1">
                        <Button size="sm" variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />} className="w-full text-xs shadow-glow">
                          Connect
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Trip Confirmation Modal */}
      {deleteModalTrip && (
        <Modal
          isOpen={!!deleteModalTrip}
          onClose={() => setDeleteModalTrip(null)}
          title="Delete Campus Trip"
        >
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-200">
                  Are you sure you want to delete this trip?
                </p>
                <p className="text-slate-300">
                  This ride will be marked as cancelled in the campus registry, removed from active search results, and your connected companions will be notified.
                </p>
              </div>
            </div>

            {/* Trip summary recap */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {deleteModalTrip.source?.name} ➔ {deleteModalTrip.destination?.name}
                </span>
                <Badge variant="brand" size="sm">
                  {deleteModalTrip.transportType}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {deleteModalTrip.travelDate} at {deleteModalTrip.departureTime ? formatTime(deleteModalTrip.departureTime) : 'N/A'}
                </span>
                <span>{deleteModalTrip.availableSeats || 1} available seats</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalTrip(null)}
                disabled={deleteTripMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteTripMutation.mutate(deleteModalTrip.id)}
                isLoading={deleteTripMutation.isPending}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
