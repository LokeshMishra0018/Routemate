import React, { useState } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  description?: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  icon?: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
  icon,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Total: {total.toLocaleString()}</span>
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* SVG Donut & Centered Info */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth - 4}
            />

            {/* Segments */}
            {segments.map((segment, index) => {
              const percent = segment.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${segment.color})` : undefined,
                  }}
                />
              );
            })}
          </svg>

          {/* Centered Stat */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-black text-white font-mono">
              {hoveredIndex !== null
                ? `${Math.round((segments[hoveredIndex].value / total) * 100)}%`
                : centerValue || total}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {hoveredIndex !== null ? segments[hoveredIndex].label : centerLabel || 'Total'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 w-full max-w-[200px]">
          {segments.map((seg, idx) => {
            const percent = Math.round((seg.value / total) * 100);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isHovered ? 'bg-slate-800/80 scale-[1.02]' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-semibold text-slate-200">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400 font-bold">{seg.value}</span>
                  <span className="text-[10px] text-slate-500 font-bold w-8 text-right">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
