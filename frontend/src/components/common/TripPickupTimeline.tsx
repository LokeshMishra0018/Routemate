import React from 'react';
import { MapPin, Navigation, Flag, Clock, Users, ArrowRight } from 'lucide-react';
import { calculateHaversineKm } from '../../services/routing.service';

export interface TimelineStopItem {
  name: string;
  sequenceNumber?: number;
  estimatedArrivalTime?: string | null;
  passengerName?: string | null;
  passengerAvatarUrl?: string | null;
  coordinates?: { coordinates: [number, number] };
}

export interface TripPickupTimelineProps {
  source: {
    name: string;
    coordinates?: { coordinates: [number, number] };
  };
  destination: {
    name: string;
    coordinates?: { coordinates: [number, number] };
  };
  departureTime?: string;
  stops?: TimelineStopItem[];
  className?: string;
  onStopClick?: (stop: TimelineStopItem | 'source' | 'destination') => void;
}

export const TripPickupTimeline: React.FC<TripPickupTimelineProps> = ({
  source,
  destination,
  departureTime = '09:00',
  stops = [],
  className = '',
  onStopClick,
}) => {
  const sortedStops = [...stops].sort(
    (a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
  );

  return (
    <div className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Navigation className="h-4 w-4 text-indigo-400" />
          <span>Route & Pickup Milestones</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {sortedStops.length + 2} Total Points
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-sky-500 before:to-amber-500">
        {/* 1. Origin / Campus Gate */}
        <div
          onClick={() => onStopClick && onStopClick('source')}
          className="relative group cursor-pointer"
        >
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-950 shadow-md group-hover:scale-125 transition-transform">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Origin (Departure)
                </span>
                {departureTime && (
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    <Clock className="h-3 w-3" /> {departureTime}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-100 group-hover:text-emerald-300 transition-colors mt-0.5">
                {source.name}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Intermediate Pickup Stops */}
        {sortedStops.map((stop, idx) => {
          return (
            <div
              key={idx}
              onClick={() => onStopClick && onStopClick(stop)}
              className="relative group cursor-pointer pl-1"
            >
              <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center border-2 border-slate-950 shadow-md group-hover:scale-125 transition-transform">
                <span className="text-[10px] font-bold text-white font-mono">{idx + 1}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/70 transition-all flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-400">
                      Pickup Stop #{idx + 1}
                    </span>
                    {stop.estimatedArrivalTime && (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> ETA: {stop.estimatedArrivalTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-200 mt-0.5">
                    {stop.name}
                  </p>
                </div>

                {stop.passengerName && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/50 px-2 py-1 rounded-lg shrink-0">
                    <Users className="h-3 w-3 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-300">
                      {stop.passengerName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 3. Destination */}
        <div
          onClick={() => onStopClick && onStopClick('destination')}
          className="relative group cursor-pointer"
        >
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-slate-950 shadow-md group-hover:scale-125 transition-transform">
            <Flag className="h-2.5 w-2.5 text-slate-950" />
          </div>

          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Destination
              </span>
              <p className="text-sm font-medium text-slate-100 group-hover:text-amber-300 transition-colors mt-0.5">
                {destination.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
