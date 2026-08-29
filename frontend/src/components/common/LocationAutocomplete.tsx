import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  GraduationCap,
  Train,
  Plane,
  Building2,
  Navigation,
  Loader2,
  X,
  Check,
  Search,
} from 'lucide-react';
import { searchPlaces, reverseGeocode, GeocodedPlace } from '../../services/geocoding.service';

export interface LocationAutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (name: string, coordinates?: [number, number], place?: GeocodedPlace) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  selectedCoordinates?: [number, number];
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder = 'Search college, metro, airport, or locality...',
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  autoFocus = false,
  selectedCoordinates,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerSearch = (query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed, 6);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedPlace(null);
    onChange(val, undefined, undefined);
    triggerSearch(val);
  };

  const handleSelectPlace = (place: GeocodedPlace) => {
    setInputValue(place.name);
    setSelectedPlace(place);
    setIsOpen(false);
    setSuggestions([]);
    onChange(place.name, place.coordinates.coordinates, place);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const place = await reverseGeocode(lat, lng);
          if (place) {
            handleSelectPlace(place);
          } else {
            const fallbackName = `Current Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            setInputValue(fallbackName);
            onChange(fallbackName, [lng, lat]);
          }
        } catch {
          const fallbackName = `GPS Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
          setInputValue(fallbackName);
          onChange(fallbackName, [lng, lat]);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        alert('Could not access your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedPlace(null);
    setSuggestions([]);
    setIsOpen(false);
    onChange('', undefined, undefined);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectPlace(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (category: GeocodedPlace['category']) => {
    switch (category) {
      case 'college':
        return <GraduationCap className="h-4 w-4 text-emerald-400" />;
      case 'metro':
        return <Train className="h-4 w-4 text-sky-400" />;
      case 'airport':
        return <Plane className="h-4 w-4 text-amber-400" />;
      case 'railway':
      case 'transit':
        return <Train className="h-4 w-4 text-indigo-400" />;
      case 'locality':
      default:
        return <Building2 className="h-4 w-4 text-slate-400" />;
    }
  };

  const getCategoryBadge = (category: GeocodedPlace['category']) => {
    switch (category) {
      case 'college':
        return <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">College</span>;
      case 'metro':
        return <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">Metro</span>;
      case 'airport':
        return <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">Airport</span>;
      case 'railway':
        return <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Station</span>;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{label} {required && <span className="text-rose-400">*</span>}</span>
          {selectedCoordinates && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <Check className="h-3 w-3" /> Geo-Verified
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-500 pointer-events-none">
          <Search className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
            else if (inputValue.trim().length >= 2) triggerSearch(inputValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500/60 rounded-xl pl-9 pr-20 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="px-2 py-1.5 rounded-lg text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all flex items-center gap-1.5 text-xs font-medium shadow-sm active:scale-95"
            title="Auto-detect current GPS location"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span className="hidden sm:inline text-[11px]">Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline text-[11px]">GPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-slate-900/95 border border-slate-800/90 rounded-xl shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto divide-y divide-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Top Quick-Action: Current GPS Location */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full text-left p-2.5 flex items-center gap-2.5 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 border-b border-indigo-500/20 transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-200">📍 Use My Current Location</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  GPS Auto-Detect
                </span>
              </div>
              <p className="text-[11px] text-indigo-300/70">Fetch your live coordinates and street address</p>
            </div>
          </button>

          {isLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Searching places in India...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">
              No matching locations found. You can still use the typed name.
            </div>
          ) : (
            suggestions.map((place, idx) => (
              <button
                key={place.id}
                type="button"
                onClick={() => handleSelectPlace(place)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                  selectedIndex === idx ? 'bg-indigo-600/20 text-slate-100' : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 mt-0.5 shrink-0">
                  {getCategoryIcon(place.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100 truncate">{place.name}</span>
                    {getCategoryBadge(place.category)}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{place.formattedAddress}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
