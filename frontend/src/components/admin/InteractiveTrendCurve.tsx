import React, { useState, useRef, useMemo } from 'react';
import { TrendingUp, Sparkles, Clock, Activity, Zap, Radio } from 'lucide-react';

export interface CurvePoint {
  label: string;
  value: number;
  hour?: number;
  fullDate?: string;
}

interface InteractiveTrendCurveProps {
  data1h?: CurvePoint[];
  data24h: CurvePoint[];
  data7d: CurvePoint[];
  data30d: CurvePoint[];
  todayPeak: number;
  todayPeakTime?: string;
  allTimePeak: number;
  allTimePeakDate?: string;
  currentLive: number;
}

export const InteractiveTrendCurve: React.FC<InteractiveTrendCurveProps> = ({
  data1h = [],
  data24h,
  data7d,
  data30d,
  todayPeak,
  todayPeakTime,
  allTimePeak,
  allTimePeakDate,
  currentLive,
}) => {
  const [activeTab, setActiveTab] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeData = useMemo(() => {
    if (activeTab === '1h') return data1h.length > 0 ? data1h : data24h;
    if (activeTab === '7d') return data7d.length > 0 ? data7d : data24h;
    if (activeTab === '30d') return data30d.length > 0 ? data30d : data24h;
    return data24h;
  }, [activeTab, data1h, data24h, data7d, data30d]);

  const width = 860;
  const height = 260;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 35;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = activeData.map((d) => d.value);
  const maxValue = Math.max(...values, 6);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  // Calculate coordinates for each point with smooth tangent bounds
  const points = useMemo(() => {
    if (activeData.length === 0) return [];
    return activeData.map((d, index) => {
      const x = paddingLeft + (index / (activeData.length - 1 || 1)) * chartWidth;
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

  // Area path for glowing aura fill
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
    return points.reduce((prev, curr) => (curr.data.value >= prev.data.value ? curr : prev), points[0]);
  }, [points]);

  const activeTarget = hoverIndex !== null ? currentHoveredPoint : (points.length > 0 ? points[points.length - 1] : null);

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800/90 p-5 space-y-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Background Subtle Cyberpunk Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-96 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white tracking-tight">
                  Concurrent Commuter Telemetry
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Stream
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time active student presence with live interactive telemetry scrubber
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Switcher Tabs & Live Mini Badge */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('1h')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '1h'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Hour
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('24h')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '24h'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 Hours
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '7d'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('30d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '30d'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Spline Graph Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none bg-slate-950/70 rounded-2xl border border-slate-800/80 pt-3 pb-2 px-1 shadow-inner"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 sm:h-64 cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Multi-stop Glowing Area Gradient */}
            <linearGradient id="cyberpunkAuraGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
              <stop offset="35%" stopColor="#8b5cf6" stopOpacity="0.18" />
              <stop offset="70%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Spline Stroke Gradient */}
            <linearGradient id="cyberpunkLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="40%" stopColor="#8b5cf6" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Intense Neon Line Glow Filter */}
            <filter id="neonLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Level Grid Lines & Left Y-Axis Values */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = paddingTop + chartHeight * pct;
            const levelVal = Math.round(maxValue - pct * range);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  opacity="0.7"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#475569"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {levelVal}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#cyberpunkAuraGradient)" />

          {/* Glowing Shadow Behind Main Spline Line */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#cyberpunkLineGradient)"
            strokeWidth="5"
            strokeOpacity="0.4"
            filter="url(#neonLineGlow)"
          />

          {/* Main Spline Line */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#cyberpunkLineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Permanent Live Indicator at the Far Right End (Current Moment) */}
          {points.length > 0 && (
            <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
              {/* Dual Concentric Sonar Wave Ping */}
              <circle r="16" fill="#10b981" fillOpacity="0.1" className="animate-pulse" />
              <circle r="10" fill="#10b981" fillOpacity="0.25" className="animate-ping" />
              <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Laser Scrubber Guide Bar & Illuminated Hover Tooltip */}
          {activeTarget && (
            <g transform={`translate(${activeTarget.x}, ${activeTarget.y})`}>
              {/* Vertical Laser Scrubber Guide Line */}
              <line
                x1="0"
                y1={-activeTarget.y + paddingTop}
                x2="0"
                y2={paddingTop + chartHeight - activeTarget.y}
                stroke="#818cf8"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                opacity={hoverIndex !== null ? '0.9' : '0.4'}
              />

              {/* Glowing Dot on Line */}
              <circle r="7" fill="#ffffff" stroke="#f59e0b" strokeWidth="3" className="shadow-lg" />
              <circle r="13" fill="#f59e0b" fillOpacity="0.2" className="animate-ping" />

              {/* Glassmorphic Floating HUD Tooltip */}
              <g transform="translate(0, 28)">
                <path d="M 0 -8 L -6 0 L 6 0 Z" fill="#030712" stroke="#475569" strokeWidth="1" />
                <rect
                  x="-52"
                  y="0"
                  width="104"
                  height="36"
                  rx="8"
                  fill="#030712"
                  fillOpacity="0.95"
                  stroke="#475569"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 8px 16px rgba(0,0,0,0.7))"
                />
                <text
                  x="0"
                  y="16"
                  textAnchor="middle"
                  fill={activeTarget.data.label === 'Now' ? '#34d399' : '#fbbf24'}
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                >
                  {activeTarget.data.value.toLocaleString()} {activeTarget.data.label === 'Now' ? 'Live Now' : 'Active'}
                </text>
                <text
                  x="0"
                  y="29"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {activeTarget.data.fullDate || (activeTarget.data.label === 'Now' ? 'Current Moment' : activeTarget.data.label)}
                </text>
              </g>
            </g>
          )}

          {/* X-Axis Timeline Labels */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const isFirst = i === 0;
            const showLabel =
              activeTab === '1h'
                ? i % 2 === 0 || isLast
                : activeTab === '24h'
                ? i % 4 === 0 || isLast
                : activeTab === '7d'
                ? true
                : i % 5 === 0 || isLast;

            if (!showLabel) return null;

            return (
              <text
                key={i}
                x={p.x}
                y={height - 12}
                textAnchor={isLast ? 'end' : isFirst ? 'start' : 'middle'}
                fill={isLast ? '#34d399' : '#64748b'}
                fontSize="10"
                fontWeight={isLast ? '900' : 'bold'}
                fontFamily="sans-serif"
              >
                {isLast ? `🟢 ${p.data.label}` : p.data.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Peak Online Telemetry Metrics Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Online Now
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {currentLive} Commuters
            </span>
          </div>
          <Clock className="w-5 h-5 text-emerald-500/30" />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/20 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Today's Peak Online
            </span>
            <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">
              {todayPeak} {todayPeak === 1 ? 'Commuter' : 'Commuters'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{todayPeakTime || 'Active Today'}</span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-500/30" />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-indigo-500/20 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> All-Time Peak Record
            </span>
            <span className="text-xl font-black text-indigo-300 font-mono mt-0.5 block">
              {allTimePeak} {allTimePeak === 1 ? 'Commuter' : 'Commuters'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{allTimePeakDate || 'Platform Record'}</span>
          </div>
          <Sparkles className="w-5 h-5 text-indigo-500/30" />
        </div>
      </div>
    </div>
  );
};
