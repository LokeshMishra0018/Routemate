import React, { useState, useRef, useMemo } from 'react';
import { TrendingUp, Sparkles, Calendar, Clock, Activity } from 'lucide-react';

export interface CurvePoint {
  label: string;
  value: number;
  hour?: number;
  fullDate?: string;
}

interface InteractiveTrendCurveProps {
  data24h: CurvePoint[];
  data7d: CurvePoint[];
  data30d: CurvePoint[];
  todayPeak: number;
  allTimePeak: number;
  currentLive: number;
}

export const InteractiveTrendCurve: React.FC<InteractiveTrendCurveProps> = ({
  data24h,
  data7d,
  data30d,
  todayPeak,
  allTimePeak,
  currentLive,
}) => {
  const [activeTab, setActiveTab] = useState<'24h' | '7d' | '30d'>('24h');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeData = useMemo(() => {
    if (activeTab === '7d') return data7d.length > 0 ? data7d : data24h;
    if (activeTab === '30d') return data30d.length > 0 ? data30d : data24h;
    return data24h;
  }, [activeTab, data24h, data7d, data30d]);

  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = activeData.map((d) => d.value);
  const maxValue = Math.max(...values, 10);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // Calculate coordinates for each point
  const points = useMemo(() => {
    if (activeData.length === 0) return [];
    return activeData.map((d, index) => {
      const x = paddingX + (index / (activeData.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((d.value - minValue) / range) * chartHeight;
      return { x, y, data: d, index };
    });
  }, [activeData, chartWidth, chartHeight, minValue, range]);

  // Generate smooth SVG cubic bezier path
  const svgPath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const controlX = (p0.x + p1.x) / 2;
      path += ` C ${controlX} ${p0.y}, ${controlX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  // Area path for gradient background
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${svgPath} L ${last.x} ${paddingTop + chartHeight} L ${first.x} ${paddingTop + chartHeight} Z`;
  }, [svgPath, points, chartHeight]);

  // Handle hover tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closestIdx = 0;
    let minDistance = Infinity;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const currentHoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const peakPoint = useMemo(() => {
    if (points.length === 0) return null;
    return points.reduce((prev, curr) => (curr.data.value > prev.data.value ? curr : prev), points[0]);
  }, [points]);

  return (
    <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Concurrent Commuter Online Telemetry
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                Live Curve
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time active student presence curve with live interactive peak detection
          </p>
        </div>

        {/* Timeframe Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('24h')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === '24h'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            24 Hours
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('7d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === '7d'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('30d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === '30d'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* SVG Interactive Spline Graph Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none bg-slate-950/60 rounded-xl border border-slate-800/60 pt-2 pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 sm:h-56 cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Smooth glowing area gradient */}
            <linearGradient id="curveAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing line stroke gradient */}
            <linearGradient id="curveLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + chartHeight * pct;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#curveAreaGradient)" />

          {/* Glow Behind Main Spline Line */}
          <path
            d={svgPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="5"
            strokeOpacity="0.35"
            filter="url(#lineGlow)"
          />

          {/* Main Spline Line */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#curveLineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* All-time / Default Peak Marker if not hovering */}
          {peakPoint && hoverIndex === null && (
            <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
              {/* White glowing dot matching the user screenshot */}
              <circle r="5.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" className="animate-pulse" />
              {/* Floating Tooltip Box */}
              <g transform="translate(0, 26)">
                <path d="M 0 -8 L -5 0 L 5 0 Z" fill="#090d16" stroke="#334155" strokeWidth="1" />
                <rect
                  x="-32"
                  y="0"
                  width="64"
                  height="26"
                  rx="6"
                  fill="#090d16"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="17"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {peakPoint.data.value.toLocaleString()}
                </text>
              </g>
            </g>
          )}

          {/* Interactive Hover Point & Floating Tooltip */}
          {currentHoveredPoint && (
            <g transform={`translate(${currentHoveredPoint.x}, ${currentHoveredPoint.y})`}>
              {/* Vertical Crosshair Guide */}
              <line
                x1="0"
                y1={-currentHoveredPoint.y + paddingTop}
                x2="0"
                y2={paddingTop + chartHeight - currentHoveredPoint.y}
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth="1"
                opacity="0.6"
              />

              {/* White Glowing Dot */}
              <circle r="7" fill="#ffffff" stroke="#f59e0b" strokeWidth="3" />
              <circle r="12" fill="#f59e0b" fillOpacity="0.25" className="animate-ping" />

              {/* Floating Dark Tooltip Box */}
              <g transform="translate(0, 26)">
                <path d="M 0 -8 L -5 0 L 5 0 Z" fill="#020617" stroke="#475569" strokeWidth="1" />
                <rect
                  x="-42"
                  y="0"
                  width="84"
                  height="34"
                  rx="8"
                  fill="#020617"
                  stroke="#475569"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />
                <text
                  x="0"
                  y="16"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="12"
                  fontWeight="black"
                  fontFamily="monospace"
                >
                  {currentHoveredPoint.data.value.toLocaleString()} Active
                </text>
                <text
                  x="0"
                  y="28"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="600"
                >
                  {currentHoveredPoint.data.fullDate || currentHoveredPoint.data.label}
                </text>
              </g>
            </g>
          )}

          {/* X-Axis Timeline Labels */}
          {points.map((p, i) => {
            const showLabel =
              activeTab === '24h'
                ? i % 4 === 0 || i === points.length - 1
                : activeTab === '7d'
                ? true
                : i % 5 === 0 || i === points.length - 1;

            if (!showLabel) return null;

            return (
              <text
                key={i}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {p.data.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Peak Online Highlights Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Live Online Now</span>
            <span className="text-lg font-black text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {currentLive} Commuters
            </span>
          </div>
          <Clock className="w-5 h-5 text-emerald-500/40" />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Today's Peak Online</span>
            <span className="text-lg font-black text-amber-300 font-mono mt-0.5 block">
              {todayPeak} Commuters
            </span>
            <span className="text-[10px] text-slate-500">09:15 AM (Morning Rush)</span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-500/40" />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">All-Time Peak Record</span>
            <span className="text-lg font-black text-indigo-300 font-mono mt-0.5 block">
              {allTimePeak} Commuters
            </span>
            <span className="text-[10px] text-slate-500">29 Aug 2026</span>
          </div>
          <Sparkles className="w-5 h-5 text-indigo-500/40" />
        </div>
      </div>
    </div>
  );
};
