import React, { useState, useMemo, useCallback } from 'react';
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
  ArrowUpDown,
  RotateCcw,
  Crosshair,
  X,
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
import { reverseGeocode, GeocodedPlace } from '../../services/geocoding.service';

interface StopItem {
  name: string;
  sequenceNumber: number;
  estimatedArrivalTime?: string;
  coordinates?: [number, number]; // [lng, lat]
}

type PinDropTarget = 'none' | 'origin' | 'destination' | number;

export const TripCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Location state with real geocoded coordinates (Fresh on mount)
  const [sourceName, setSourceName] = useState('');
  const [sourceCoords, setSourceCoords] = useState<[number, number] | undefined>(undefined);

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

  // Pin Dropper Mode state ('none' means map clicks won't accidentally drop pins)
  const [pinDropMode, setPinDropMode] = useState<PinDropTarget>('none');

  // Preferences
  const [genderPref, setGenderPref] = useState<'any' | 'same_gender'>('any');
  const [conversationPref, setConversationPref] = useState<'quiet' | 'moderate' | 'chatty'>('moderate');

  // Cost sharing
  const [enableCostSharing, setEnableCostSharing] = useState(true);
  const [estimatedCost, setEstimatedCost] = useState<number>(350);

  // Route metrics from live calculation
  const [routeStats, setRouteStats] = useState<RouteCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRouteCalculated = useCallback((stats: RouteCalculationResult) => {
    setRouteStats(stats);
  }, []);

  // Swap Origin and Destination
  const handleSwapOriginDestination = () => {
    const tempName = sourceName;
    const tempCoords = sourceCoords;
    setSourceName(destName);
    setSourceCoords(destCoords);
    setDestName(tempName);
    setDestCoords(tempCoords);
  };

  // 1-Tap Reset entire route
  const handleResetRoute = () => {
    setSourceName('');
    setSourceCoords(undefined);
    setDestName('');
    setDestCoords(undefined);
    setStops([]);
    setRouteStats(null);
    setPinDropMode('none');
  };

  // Handle clicking on map when Pin Placement Mode is active
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (pinDropMode === 'none') return; // Do nothing if not in placement mode (avoids accidental clicks)

    let locationLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const place = await reverseGeocode(lat, lng);
      if (place?.name) {
        locationLabel = place.name;
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }

    if (pinDropMode === 'origin') {
      setSourceName(locationLabel);
      setSourceCoords([lng, lat]);
    } else if (pinDropMode === 'destination') {
      setDestName(locationLabel);
      setDestCoords([lng, lat]);
    } else if (typeof pinDropMode === 'number') {
      setStops((prev) =>
        prev.map((s, idx) =>
          idx === pinDropMode ? { ...s, name: locationLabel, coordinates: [lng, lat] } : s
        )
      );
    }

    setPinDropMode('none'); // Turn off after placing pin
  }, [pinDropMode]);

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
    if (pinDropMode === index) setPinDropMode('none');
  };

  const handleStopChange = (
    index: number,
    field: keyof StopItem,
    value: string | number | [number, number]
  ) => {
    setStops((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const estimatedPerSeatCost = useMemo(() => {
    if (!enableCostSharing || availableSeats <= 0 || !estimatedCost) return 0;
    return Math.round(estimatedCost / (availableSeats + 1));
  }, [enableCostSharing, availableSeats, estimatedCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceName.trim()) {
      error('Please select an origin departure location');
      return;
    }

    if (!destName.trim()) {
      error('Please select a destination');
      return;
    }

    const mapTransportType = (type: string): 'train' | 'bus' | 'flight' | 'cab' | 'personal_vehicle' | 'other' => {
      switch (type) {
        case 'cab': return 'cab';
        case 'carpool': return 'personal_vehicle';
        case 'auto': return 'other';
        case 'metro_walk': return 'train';
        default: return 'cab';
      }
    };

    const payload = {
      source: {
        name: sourceName,
        coordinates: {
          type: 'Point' as const,
          coordinates: sourceCoords || [77.4977, 28.7532],
        },
      },
      destination: {
        name: destName,
        coordinates: {
          type: 'Point' as const,
          coordinates: destCoords || [77.3153, 28.6469],
        },
      },
      travelDate,
      departureTime,
      transportType: mapTransportType(transportType),
      availableSeats: Number(availableSeats) || 1,
      stops: stops
        .filter((s) => s.name.trim() !== '')
        .map((s, idx) => ({
          name: s.name,
          sequenceNumber: idx + 1,
          estimatedArrivalTime: s.estimatedArrivalTime || undefined,
          coordinates: {
            type: 'Point' as const,
            coordinates: s.coordinates || [77.4977, 28.7532],
          },
        })),
      preferences: {
        genderPreference: genderPref,
        conversationPreference: (conversationPref === 'chatty' ? 'talkative' : conversationPref) as 'quiet' | 'moderate' | 'talkative',
      },
      costSharing: {
        enabled: enableCostSharing,
        estimatedTotalCost: enableCostSharing ? Number(estimatedCost) : undefined,
        currency: 'INR',
      },
      notes: notes.trim() || undefined,
    };

    setIsLoading(true);
    try {
      const response = await apiClient.post('/trips', payload);
      if (response.data.success) {
        success('Trip published successfully! Smart Matching is now active.');
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        navigate('/trips');
      }
    } catch (err: any) {
      error(err?.response?.data?.message || 'Failed to publish trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>Smart Route Planner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Publish a Trip
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Select your departure, intermediate pickup gates, and destination with real road route preview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trip Details Form (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* 1. Origin & Destination Route Card */}
          <Card className="glass-card overflow-visible relative z-30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" /> Route & Schedule
                </CardTitle>
                <CardDescription>
                  Search campus gates, metro stations, airports, or pick up spots in India
                </CardDescription>
              </div>

              {(sourceName || destName || stops.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetRoute}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Clear all route fields"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </CardHeader>

            <CardContent className="space-y-4 overflow-visible">
              {/* Origin Search */}
              <div className="space-y-1.5">
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

                {/* Origin Quick Actions: Presets + Pick on Map */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPinDropMode(pinDropMode === 'origin' ? 'none' : 'origin')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 ${
                      pinDropMode === 'origin'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{pinDropMode === 'origin' ? '📍 Clicking on Map...' : '📍 Pick on Map'}</span>
                  </button>

                  <span className="text-slate-600 text-xs mx-0.5">|</span>

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
              </div>

              {/* Direction Swap Button */}
              <div className="flex items-center justify-center my-0.5">
                <button
                  type="button"
                  onClick={handleSwapOriginDestination}
                  className="px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                  title="Swap Origin and Destination"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Swap Direction</span>
                </button>
              </div>

              {/* Destination Search */}
              <div className="space-y-1.5">
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

                {/* Destination Quick Actions: Presets + Pick on Map */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPinDropMode(pinDropMode === 'destination' ? 'none' : 'destination')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 ${
                      pinDropMode === 'destination'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{pinDropMode === 'destination' ? '📍 Clicking on Map...' : '📍 Pick on Map'}</span>
                  </button>

                  <span className="text-slate-600 text-xs mx-0.5">|</span>

                  <button
                    type="button"
                    onClick={() => {
                      setDestName('Anand Vihar ISBT / Railway Terminal');
                      setDestCoords([77.3153, 28.6469]);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                  >
                    🚆 Anand Vihar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestName('IGI Airport Terminal 3, New Delhi');
                      setDestCoords([77.0854, 28.5562]);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                  >
                    ✈️ IGI Airport
                  </button>
                </div>
              </div>

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
                  required
                />

                <Select
                  label="Transport Mode"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  options={[
                    { value: 'cab', label: '🚖 Cab / Rideshare' },
                    { value: 'carpool', label: '🚗 Personal Car' },
                    { value: 'auto', label: '🛺 Auto Rickshaw' },
                    { value: 'metro_walk', label: '🚇 Metro + Walking' },
                  ]}
                />
              </div>

              {/* Intermediate Pickup Stops Section (Clean, Non-Collapsing Design) */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Intermediate Pickup Stops
                    </h4>
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
                  <div className="space-y-3 overflow-visible relative z-20">
                    {stops.map((stop, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 relative"
                        style={{ zIndex: 60 - idx }}
                      >
                        {/* Stop Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Stop #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPinDropMode(pinDropMode === idx ? 'none' : idx)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 active:scale-95 ${
                                pinDropMode === idx
                                  ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/30'
                                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/25'
                              }`}
                            >
                              <Crosshair className="w-2.5 h-2.5" />
                              <span>{pinDropMode === idx ? '📍 Click Map' : '📍 Pick on Map'}</span>
                            </button>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveStop(idx)}
                            className="p-1.5 h-7 w-7 rounded-lg"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Stop Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div className="sm:col-span-2">
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

                          <Input
                            type="time"
                            placeholder="ETA"
                            value={stop.estimatedArrivalTime || ''}
                            onChange={(e) =>
                              handleStopChange(idx, 'estimatedArrivalTime', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Capacity & Cost Splitting Card */}
          <Card className="glass-card relative z-10">
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
                    { value: 'quiet', label: '🎧 Quiet & Focused' },
                    { value: 'moderate', label: '☕ Moderate & Friendly' },
                    { value: 'chatty', label: '💬 Chatty & Social' },
                  ]}
                />
              </div>

              {/* Cost Splitting */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Dynamic Cost Sharing
                    </h4>
                    <p className="text-xs text-slate-400">
                      Evenly divides total travel expense across all companion seats
                    </p>
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

            <CardContent className="p-3 pt-0 space-y-2">
              {/* Active Pin Placement Banner (Appears only when user clicks 'Pick on Map') */}
              {pinDropMode !== 'none' && (
                <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-between text-xs text-indigo-200 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span>
                      Click anywhere on the map to set{' '}
                      <strong className="text-white capitalize">
                        {pinDropMode === 'origin'
                          ? 'Origin'
                          : pinDropMode === 'destination'
                          ? 'Destination'
                          : `Stop #${Number(pinDropMode) + 1}`}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPinDropMode('none')}
                    className="p-1 hover:bg-indigo-500/30 rounded-lg text-indigo-300 hover:text-white transition"
                    title="Cancel pin placement"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Main Interactive Map Component */}
              <TripRouteMap
                waypoints={mapWaypoints}
                className="h-[440px] w-full rounded-xl"
                showStatsHud={true}
                onRouteCalculated={handleRouteCalculated}
                onMapClick={handleMapClick}
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
