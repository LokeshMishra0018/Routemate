import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    default: 'bg-slate-800 text-slate-200 border border-slate-700',
    brand: 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30',
    success: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-950/80 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-950/80 text-rose-300 border border-rose-500/30',
    outline: 'border border-slate-600 text-slate-300',
    neutral: 'bg-slate-900 text-slate-400 border border-slate-800',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

export interface AvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  role?: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  verified = false,
  role,
  className,
  ...props
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const isAdmin = role === 'admin';

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'RM';

  return (
    <div className={cn('relative inline-flex shrink-0', className)} {...props}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-indigo-600 to-indigo-900 text-white border border-indigo-400/30 overflow-hidden shadow-md',
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {isAdmin ? (
        <span
          title="Campus Administrator (Official)"
          className="absolute -bottom-1 -right-1 flex items-center justify-center filter drop-shadow-[0_2px_6px_rgba(234,179,8,0.7)]"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#eab308] fill-current">
            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.33 2.33 4.85-4.86 1.41 1.42-6.26 6.27z" />
          </svg>
        </span>
      ) : verified ? (
        <span
          title="Official ID Verified Student"
          className="absolute -bottom-1 -right-1 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1d9bf0] fill-current">
            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.33 2.33 4.85-4.86 1.41 1.42-6.26 6.27z" />
          </svg>
        </span>
      ) : null}
    </div>
  );
};
