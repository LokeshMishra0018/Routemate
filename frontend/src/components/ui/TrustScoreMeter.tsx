import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TrustScoreMeterProps {
  score: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TrustScoreMeter: React.FC<TrustScoreMeterProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const normalized = Math.min(100, Math.max(0, score));

  // Color gradient and icon based on score
  let color = 'from-emerald-500 to-teal-400 text-emerald-400';
  let badgeBg = 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300';
  let level = 'High Trust';
  let Icon = ShieldCheck;

  if (normalized < 40) {
    color = 'from-amber-500 to-yellow-400 text-amber-400';
    badgeBg = 'bg-amber-950/80 border-amber-500/30 text-amber-300';
    level = 'Developing';
    Icon = ShieldAlert;
  } else if (normalized < 70) {
    color = 'from-indigo-500 to-sky-400 text-indigo-400';
    badgeBg = 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300';
    level = 'Verified';
    Icon = Shield;
  }

  if (size === 'sm') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold', badgeBg)}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{normalized}</span>
        {showLabel && <span className="opacity-75 font-normal">({level})</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Icon className="w-4 h-4 text-emerald-400" />
          <span>Trust Score</span>
        </div>
        <span className="font-bold text-slate-100">
          {normalized}/100 <span className="text-slate-400 font-normal">({level})</span>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', color)}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
};
