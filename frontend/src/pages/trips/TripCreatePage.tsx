import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

interface StopItem {
  name: string;
  sequenceNumber: number;
  estimatedArrivalTime?: string;
}

export const TripCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [sourceName, setSourceName] = useState('');
  const [destName, setDestName] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [departureTime, setDepartureTime] = useState('09:00');
  const [transportType, setTransportType] = useState('train');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<StopItem[]>([]);

  // Preferences
  const [genderPref, setGenderPref] = useState<'any' | 'same_gender'>('any');
  const [conversationPref, setConversationPref] = useState<'quiet' | 'moderate' | 'chatty'>('moderate');

  // Cost sharing
  const [enableCostSharing, setEnableCostSharing] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(300);

  const [isLoading, setIsLoading] = useState(false);

  const handleAddStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', sequenceNumber: prev.length + 1, estimatedArrivalTime: '' },
    ]);
  };

  const handleRemoveStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, field: keyof StopItem, value: string | number) => {
    setStops((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validStops = stops
        .filter((s) => s.name.trim().length > 0)
        .map((s, idx) => ({
          name: s.name.trim(),
          sequenceNumber: idx + 1,
          estimatedArrivalTime: s.estimatedArrivalTime || undefined,
        }));

      const payload = {
        source: { name: sourceName.trim() },
        destination: { name: destName.trim() },
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
      success('Trip Published', 'Your travel plan has been scheduled.');
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Publish a Trip</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Share your travel itinerary to instantly discover and connect with compatible student commuters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Details Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" /> Route & Schedule
            </CardTitle>
            <CardDescription>Specify origin, destination, intermediate transit points and time</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Origin / Source Location"
                placeholder="E.g. KIET Campus, Ghaziabad"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-emerald-400" />}
                required
              />

              <Input
                label="Destination Location"
                placeholder="E.g. Anand Vihar ISBT / New Delhi"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-indigo-400" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Travel Date"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />

              <Input
                label="Departure Time"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                leftIcon={<Clock className="w-4 h-4" />}
              />

              <Select
                label="Transport Mode"
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                options={[
                  { value: 'train', label: '🚆 Train' },
                  { value: 'bus', label: '🚌 Bus' },
                  { value: 'cab', label: '🚖 Cab / Rideshare' },
                  { value: 'personal_vehicle', label: '🚗 Personal Car / Bike' },
                  { value: 'flight', label: '✈️ Flight' },
                  { value: 'other', label: '🚲 Other' },
                ]}
              />
            </div>

            {/* Intermediate Stops */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Intermediate Stops (Optional)
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={handleAddStop} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Stop
                </Button>
              </div>

              {stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Stop #${idx + 1} Name`}
                    value={stop.name}
                    onChange={(e) => handleStopChange(idx, 'name', e.target.value)}
                  />
                  <Input
                    type="time"
                    placeholder="Est. Time"
                    value={stop.estimatedArrivalTime || ''}
                    onChange={(e) => handleStopChange(idx, 'estimatedArrivalTime', e.target.value)}
                    className="w-36 shrink-0"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveStop(idx)}
                    className="shrink-0 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferences & Cost Sharing Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Capacity & Travel Preferences
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
                leftIcon={<Car className="w-4 h-4" />}
              />

              <Select
                label="Gender Preference"
                value={genderPref}
                onChange={(e) => setGenderPref(e.target.value as 'any' | 'same_gender')}
                options={[
                  { value: 'any', label: 'Any Gender' },
                  { value: 'same_gender', label: 'Same Gender Only' },
                ]}
              />

              <Select
                label="Vibe & Conversation"
                value={conversationPref}
                onChange={(e) => setConversationPref(e.target.value as 'quiet' | 'moderate' | 'chatty')}
                options={[
                  { value: 'quiet', label: 'Quiet / Focused' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'chatty', label: 'Chatty & Social' },
                ]}
              />
            </div>

            {/* Cost sharing toggle */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Dynamic Cost Sharing</span>
                  <span className="text-xs text-slate-400">
                    Automatically split cab or fuel expenses among verified co-travelers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableCostSharing}
                  onChange={(e) => setEnableCostSharing(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {enableCostSharing && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                  <Input
                    label="Estimated Total Trip Expense (INR)"
                    type="number"
                    min={0}
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    leftIcon={<DollarSign className="w-4 h-4 text-emerald-400" />}
                    helperText="Per-person share will automatically recalculate as verified companions join."
                  />
                </div>
              )}
            </div>

            <Textarea
              label="Trip Notes / Meeting Point Details"
              placeholder="E.g. Meeting near KIET Gate 1 at 8:45 AM. Carrying light luggage only."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/trips')}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Publish Trip & Match Companions
          </Button>
        </div>
      </form>
    </div>
  );
};
