import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Navigation,
  CheckCircle2,
  Shield,
  Leaf,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete';
import { TripRouteMap, MapWaypoint } from '../../components/common/TripRouteMap';
import { RouteCalculationResult } from '../../services/routing.service';
import { GeocodedPlace } from '../../services/geocoding.service';

interface StopItem {
  name: string;
  sequenceNumber: number;
  estimatedArrivalTime?: string;
  coordinates?: [number, number]; // [lng, lat]
}

export const TripCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Location state with real geocoded coordinates
  const [sourceName, setSourceName] = useState('KIET Group of Institutions, Ghaziabad');
  const [sourceCoords, setSourceCoords] = useState<[number, number]>([77.4977, 28.7532]); // Default KIET coordinates

  const [destName, setDestName] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | undefined>(undefined);

  const [travelDate, setTravelDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [departureTime, setDepartureTime] = useState('09:00');
  const [transportType, setTransportType] = useState('cab');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<StopItem[]>([]);

  // Preferences
  const [genderPref, setGenderPref] = useState<'any' | 'same_gender'>('any');
  const [conversationPref, setConversationPref] = useState<'quiet' | 'moderate' | 'chatty'>('moderate');

  // Cost sharing
  const [enableCostSharing, setEnableCostSharing] = useState(true);
  const [estimatedCost, setEstimatedCost] = useState<number>(350);

  // Route metrics from live calculation
  const [routeStats, setRouteStats] = useState<RouteCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Build waypoints array for live map rendering
  const mapWaypoints: MapWaypoint[] = useMemo(() => {
    const list: MapWaypoint[] = [];

    if (sourceCoords) {
      list.push({
        name: sourceName || 'Origin',
        latitude: sourceCoords[1],
        longitude: sourceCoords[0],
        type: 'origin',
      });
    }

    stops.forEach((stop, idx) => {
      if (stop.coordinates) {
        list.push({
          name: stop.name || `Stop #${idx + 1}`,
          latitude: stop.coordinates[1],
          longitude: stop.coordinates[0],
          type: 'stop',
          sequenceNumber: idx + 1,
          info: stop.estimatedArrivalTime ? `ETA: ${stop.estimatedArrivalTime}` : undefined,
        });
      }
    });

    if (destCoords) {
      list.push({
        name: destName || 'Destination',
        latitude: destCoords[1],
        longitude: destCoords[0],
        type: 'destination',
      });
    }

    return list;
  }, [sourceName, sourceCoords, destName, destCoords, stops]);

  const handleAddStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', sequenceNumber: prev.length + 1, estimatedArrivalTime: '' },
    ]);
  };

  const handleRemoveStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStopChange = (
    index: number,
    field: keyof StopItem,
    value: string | number | [number, number]
  ) => {
    setStops((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceName.trim() || !destName.trim()) {
      error('Missing Route', 'Please select both an Origin and a Destination.');
      return;
    }

    // Default fallback coordinates if user typed custom string without selecting autocomplete
    const finalSourceCoords = sourceCoords || [77.4977, 28.7532];
    const finalDestCoords = destCoords || [77.2090, 28.6139]; // Default New Delhi center if unresolved

    setIsLoading(true);

    try {
      const validStops = stops
        .filter((s) => s.name.trim().length > 0)
        .map((s, idx) => ({
          name: s.name.trim(),
          normalizedName: s.name.toLowerCase().trim(),
          coordinates: {
            type: 'Point' as const,
            coordinates: s.coordinates || [finalSourceCoords[0], finalSourceCoords[1]],
          },
          sequenceNumber: idx + 1,
          estimatedArrivalTime: s.estimatedArrivalTime || undefined,
        }));

      const payload = {
        source: {
          name: sourceName.trim(),
          normalizedName: sourceName.toLowerCase().trim(),
          coordinates: {
            type: 'Point',
            coordinates: finalSourceCoords,
          },
        },
        destination: {
          name: destName.trim(),
          normalizedName: destName.toLowerCase().trim(),
          coordinates: {
            type: 'Point',
            coordinates: finalDestCoords,
          },
        },
        travelDate,
        departureTime: departureTime || undefined,
        transportType,
        availableSeats: Number(availableSeats) || undefined,
        stops: validStops.length > 0 ? validStops : undefined,
        notes: notes.trim() || undefined,
        preferences: {
          genderPreference: genderPref,
          conversationPreference: conversationPref,
        },
        costSharing: enableCostSharing
          ? {
              enabled: true,
              estimatedTotalCost: Number(estimatedCost) || 0,
              currency: 'INR',
            }
          : undefined,
      };

      const res = await apiClient.post('/trips', payload);
      const tripId = res.data.data.id;
      success('Trip Published Successfully!', 'Your travel plan is live and matching commuters.');
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-trips-dashboard'] });
      navigate(`/matches?tripId=${tripId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        error('Failed to publish trip', err.message);
      } else {
        error('Failed to create trip', 'Please review the input form.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate dynamic per-person split estimate
  const estimatedPerSeatCost = useMemo(() => {
    if (!enableCostSharing || !estimatedCost) return 0;
    const totalPeople = (Number(availableSeats) || 1) + 1; // driver/creator + available seats
    return Math.round(estimatedCost / totalPeople);
  }, [enableCostSharing, estimatedCost, availableSeats]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <Navigation className="w-4 h-4" /> Smart Route Planner
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
          Publish a Trip
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Select your departure, intermediate pickup gates, and destination with real road route preview.
        </p>
      </div>

      {/* Split-Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* 1. Origin & Destination Route Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" /> Route & Schedule
              </CardTitle>
              <CardDescription>
                Search campus gates, metro stations, airports, or pick up spots in India
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Origin Search */}
              <LocationAutocomplete
                label="Origin / Departure Location"
                placeholder="E.g. KIET Campus, Ghaziabad"
                value={sourceName}
                selectedCoordinates={sourceCoords}
                onChange={(name, coords) => {
                  setSourceName(name);
                  if (coords) setSourceCoords(coords);
                }}
                required
              />

              {/* Origin Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 -mt-2">
                <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        setSourceName(`Current GPS Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
                        setSourceCoords([lng, lat]);
                      });
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1 active:scale-95"
                >
                  <Navigation className="w-3 h-3 text-indigo-400" />
                  <span>📍 My Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceName('KIET Group of Institutions, Ghaziabad');
                    setSourceCoords([77.4984, 28.7533]);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                >
                  🎓 KIET Campus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceName('Shaheed Sthal (New Bus Adda) Metro');
                    setSourceCoords([77.4248, 28.6713]);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                >
                  🚇 Shaheed Sthal
                </button>
              </div>

              {/* Destination Search */}
              <LocationAutocomplete
                label="Destination Location"
                placeholder="E.g. Anand Vihar ISBT / New Delhi"
                value={destName}
                selectedCoordinates={destCoords}
                onChange={(name, coords) => {
                  setDestName(name);
                  if (coords) setDestCoords(coords);
                }}
                required
              />

              {/* Date, Time, Transport Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Input
                  label="Travel Date"
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                  required
                />

                <Input
                  label="Departure Time"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  leftIcon={<Clock className="w-4 h-4 text-slate-400" />}
                />

                <Select
                  label="Transport Mode"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  options={[
                    { value: 'cab', label: '🚖 Cab / Rideshare' },
                    { value: 'personal_vehicle', label: '🚗 Personal Car / Bike' },
                    { value: 'train', label: '🚆 Train / Metro' },
                    { value: 'bus', label: '🚌 Bus' },
                    { value: 'flight', label: '✈️ Flight' },
                    { value: 'other', label: '🚲 Other' },
                  ]}
                />
              </div>

              {/* Intermediate Stops Accordion */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                      Intermediate Pickup Stops
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Add metro stations or highway crossings along your commute
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleAddStop}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-400" />}
                    className="border border-slate-700/60"
                  >
                    Add Stop
                  </Button>
                </div>

                {stops.length > 0 && (
                  <div className="space-y-3">
                    {stops.map((stop, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                      >
                        <div className="flex-1">
                          <LocationAutocomplete
                            placeholder={`Stop #${idx + 1} Name`}
                            value={stop.name}
                            selectedCoordinates={stop.coordinates}
                            onChange={(name, coords) => {
                              handleStopChange(idx, 'name', name);
                              if (coords) handleStopChange(idx, 'coordinates', coords);
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            placeholder="ETA"
                            value={stop.estimatedArrivalTime || ''}
                            onChange={(e) =>
                              handleStopChange(idx, 'estimatedArrivalTime', e.target.value)
                            }
                            className="w-28 shrink-0"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveStop(idx)}
                            className="shrink-0 p-2.5 rounded-xl"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Capacity & Cost Splitting Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Seats & Travel Preferences
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Available Seats / Companions"
                  type="number"
                  min={1}
                  max={10}
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(Number(e.target.value))}
                  leftIcon={<Car className="w-4 h-4 text-slate-400" />}
                />

                <Select
                  label="Gender Preference"
                  value={genderPref}
                  onChange={(e) => setGenderPref(e.target.value as 'any' | 'same_gender')}
                  options={[
                    { value: 'any', label: '👥 Any Gender' },
                    { value: 'same_gender', label: '🔒 Same Gender Only' },
                  ]}
                />

                <Select
                  label="Vibe & Chat"
                  value={conversationPref}
                  onChange={(e) =>
                    setConversationPref(e.target.value as 'quiet' | 'moderate' | 'chatty')
                  }
                  options={[
                    { value: 'moderate', label: '☕ Moderate & Friendly' },
                    { value: 'quiet', label: '🎧 Quiet / Studying' },
                    { value: 'chatty', label: '💬 Chatty & Social' },
                  ]}
                />
              </div>

              {/* Dynamic Fare Splitting Toggle */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-200 block">
                        Dynamic Cost Sharing
                      </span>
                      <span className="text-xs text-slate-400">
                        Calculates instant per-person shares for cab fares, fuel, and tolls.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableCostSharing}
                    onChange={(e) => setEnableCostSharing(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {enableCostSharing && (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <Input
                        label="Estimated Total Expense (INR)"
                        type="number"
                        min={0}
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(Number(e.target.value))}
                        leftIcon={<span className="text-sm font-bold text-emerald-400">₹</span>}
                      />

                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-center">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">
                          Estimated Cost Per Person
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-emerald-400">
                            ₹{estimatedPerSeatCost}
                          </span>
                          <span className="text-xs text-slate-400">/ seat</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Textarea
                label="Trip Notes / Meeting Point Details"
                placeholder="E.g. Meeting near KIET Gate 1 at 8:45 AM. Carrying light backpacks only."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/trips')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="shadow-xl shadow-indigo-600/25"
            >
              Publish Journey & Find Matches
            </Button>
          </div>
        </form>

        {/* Right Column: Live Interactive Map Radar (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
                  <Navigation className="w-4 h-4 text-sky-400" /> Interactive Route Radar
                </CardTitle>
                {mapWaypoints.length >= 2 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live OSRM Route
                  </span>
                )}
              </div>
              <CardDescription>
                Real-time road geometry and transit calculation along highways
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 pt-0">
              {/* Main Interactive Map Component */}
              <TripRouteMap
                waypoints={mapWaypoints}
                className="h-[380px] w-full rounded-xl"
                showStatsHud={true}
                onRouteCalculated={(stats) => setRouteStats(stats)}
              />

              {/* Eco Footprint & Verified Safety Badge */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Carbon Saved</span>
                    <span className="font-bold text-emerald-300">
                      {routeStats?.distanceKm
                        ? `~${(routeStats.distanceKm * 0.12).toFixed(1)} kg CO₂`
                        : 'Pooling Savings'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Safety Protocol</span>
                    <span className="font-bold text-indigo-300">Verified Campus</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
