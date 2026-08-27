import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, MapPin, Clock, Users, DollarSign, Filter } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Trip } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';
import { formatTime, formatIndianCurrency } from '../../lib/utils';

export const TripsListPage: React.FC = () => {
  const [transportFilter, setTransportFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const { data: trips, isLoading, isError, refetch } = useQuery({
    queryKey: ['trips-list', transportFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (transportFilter) params.append('transportType', transportFilter);
      if (dateFilter) params.append('date', dateFilter);

      const res = await apiClient.get(`/trips?${params.toString()}`);
      return res.data.data as Trip[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Create CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Campus Trips</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse and publish student travel schedules across trains, buses, cabs, and personal vehicles.
          </p>
        </div>
        <Link to="/trips/new" className="w-full sm:w-auto">
          <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />} className="w-full">
            Schedule Trip
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
          <Filter className="w-4 h-4 text-indigo-400" /> Filters:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          <Select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            options={[
              { value: '', label: 'All Transport Modes' },
              { value: 'train', label: '🚆 Train' },
              { value: 'bus', label: '🚌 Bus' },
              { value: 'cab', label: '🚖 Cab / Rideshare' },
              { value: 'personal_vehicle', label: '🚗 Personal Vehicle' },
              { value: 'flight', label: '✈️ Flight' },
            ]}
          />

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filter by travel date"
          />
        </div>

        {(transportFilter || dateFilter) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTransportFilter('');
              setDateFilter('');
            }}
            className="text-xs shrink-0 text-slate-400 hover:text-white"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Trips Content */}
      {isLoading && <LoadingSpinner text="Loading campus routes..." />}
      {isError && <ErrorState message="Could not fetch trips list." onRetry={() => refetch()} />}

      {!isLoading && !isError && (!trips || trips.length === 0) && (
        <EmptyState
          title="No Matching Trips Found"
          description="Try adjusting your date or transport filters, or schedule a new trip to start matching."
          actionLabel="Publish a New Trip"
          onAction={() => window.location.assign('/trips/new')}
        />
      )}

      {!isLoading && !isError && trips && trips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <Card key={trip.id} hoverEffect className="glass-card flex flex-col justify-between p-5">
              <div className="space-y-3.5">
                {/* Mode & Date header */}
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {trip.transportType.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-300">{trip.travelDate}</span>
                </div>

                {/* Source & Destination */}
                <div className="space-y-2 text-left">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">From</span>
                      <span className="text-sm font-bold text-slate-100">{trip.source.name}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">To</span>
                      <span className="text-sm font-bold text-slate-100">{trip.destination.name}</span>
                    </div>
                  </div>
                </div>

                {/* Trip meta */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  {trip.departureTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTime(trip.departureTime)}</span>
                    </div>
                  )}

                  {trip.availableSeats !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.availableSeats} seats open</span>
                    </div>
                  )}
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
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <Link to={`/matches?tripId=${trip.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    Find Matches
                  </Button>
                </Link>
                <Link to={`/trips/${trip.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs text-indigo-400">
                    View Details →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
