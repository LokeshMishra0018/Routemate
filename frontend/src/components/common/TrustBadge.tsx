import React from 'react';

export type VerificationTier = 'unverified' | 'partially_verified' | 'fully_verified';

interface TrustBadgeProps {
  tier?: VerificationTier | string | null;
  /**
   * If true, only renders the Twitter-style medallion icon (ideal for placing next to student names).
   * If false, renders the full pill badge with icon and descriptive text.
   */
  iconOnly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

/**
 * Twitter/X Style Scalloped Medallion Badge Component
 * - Fully Verified: Official Twitter Blue Scallop with White Checkmark Tick (✔)
 * - Partially Verified: Amber / Yellow Scallop with White Clock / Hourglass (⏳)
 * - Unverified: Rose / Red Scallop with White Exclamation Mark (!)
 */
export const TrustBadge: React.FC<TrustBadgeProps> = ({
  tier = 'partially_verified',
  iconOnly = false,
  size = 'sm',
  className = '',
  showTooltip = true,
}) => {
  const normalizedTier: VerificationTier =
    tier === 'fully_verified' || tier === 'approved'
      ? 'fully_verified'
      : tier === 'unverified'
        ? 'unverified'
        : 'partially_verified';

  // Sizing map for the SVG medallion icon
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 min-w-[14px]',
    sm: 'w-4 h-4 min-w-[16px]',
    md: 'w-5 h-5 min-w-[20px]',
    lg: 'w-7 h-7 min-w-[28px]',
  };

  const pillTextSizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5',
  };

  // 1. Fully Verified: Twitter Blue Scalloped Badge with White Checkmark Tick (✔)
  if (normalizedTier === 'fully_verified') {
    const icon = (
      <svg
        viewBox="0 0 24 24"
        aria-label="Official ID Verified Student"
        className={`${sizeClasses[size]} inline-block flex-shrink-0 drop-shadow-[0_0_8px_rgba(29,155,240,0.5)] transition-transform hover:scale-110`}
      >
        {/* Scalloped Medallion Background */}
        <path
          fill="#1d9bf0"
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        />
        {/* Crisp White Checkmark Tick */}
        <path
          fill="#ffffff"
          d="M10.54 16.2L6.8 12.46l1.41-1.42 2.33 2.33 4.85-4.86 1.41 1.42-6.26 6.27z"
        />
      </svg>
    );

    if (iconOnly) {
      return (
        <span
          title={showTooltip ? 'Verified Student (Official College ID Approved)' : undefined}
          className={`inline-flex items-center align-middle ${className}`}
        >
          {icon}
        </span>
      );
    }

    return (
      <span
        title={showTooltip ? 'Official College ID Verified & Approved by Admin' : undefined}
        className={`inline-flex items-center font-medium rounded-full bg-[#1d9bf0]/10 text-[#38bdf8] border border-[#1d9bf0]/30 backdrop-blur-md shadow-sm ${pillTextSizes[size]} ${className}`}
      >
        {icon}
        <span>Official ID Verified</span>
      </span>
    );
  }

  // 2. Partially Verified: Amber / Yellow Scalloped Badge with Clock / Hourglass
  if (normalizedTier === 'partially_verified') {
    const icon = (
      <svg
        viewBox="0 0 24 24"
        aria-label="Email Verified, ID Pending"
        className={`${sizeClasses[size]} inline-block flex-shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-transform hover:scale-110`}
      >
        {/* Scalloped Medallion Background in Yellow/Amber */}
        <path
          fill="#f59e0b"
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        />
        {/* White Clock / Hourglass Indicator */}
        <circle cx="12" cy="12" r="5" fill="none" stroke="#18181b" strokeWidth="1.8" />
        <polyline points="12 9.5 12 12 13.8 13.5" fill="none" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );

    if (iconOnly) {
      return (
        <span
          title={showTooltip ? 'Email Verified (College ID Card Pending)' : undefined}
          className={`inline-flex items-center align-middle ${className}`}
        >
          {icon}
        </span>
      );
    }

    return (
      <span
        title={showTooltip ? 'Campus institutional email verified. College ID verification pending.' : undefined}
        className={`inline-flex items-center font-medium rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm ${pillTextSizes[size]} ${className}`}
      >
        {icon}
        <span>Email Verified (ID Pending)</span>
      </span>
    );
  }

  // 3. Unverified: Red Scalloped Badge with Exclamation Mark (!)
  const icon = (
    <svg
      viewBox="0 0 24 24"
      aria-label="Unverified Student Account"
      className={`${sizeClasses[size]} inline-block flex-shrink-0 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] transition-transform hover:scale-110`}
    >
      {/* Scalloped Medallion Background in Rose/Red */}
      <path
        fill="#f43f5e"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      {/* White Bold Exclamation Mark (!) */}
      <path
        fill="#ffffff"
        d="M12 7.2c.66 0 1.2.54 1.2 1.2v4.8c0 .66-.54 1.2-1.2 1.2s-1.2-.54-1.2-1.2V8.4c0-.66.54-1.2 1.2-1.2zm0 8.8c.77 0 1.4.63 1.4 1.4s-.63 1.4-1.4 1.4-1.4-.63-1.4-1.4.63-1.4 1.4-1.4z"
      />
    </svg>
  );

  if (iconOnly) {
    return (
      <span
        title={showTooltip ? 'Unverified Account (Email Verification Required)' : undefined}
        className={`inline-flex items-center align-middle ${className}`}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      title={showTooltip ? 'Please verify your institutional email address.' : undefined}
      className={`inline-flex items-center font-medium rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 backdrop-blur-md shadow-sm ${pillTextSizes[size]} ${className}`}
    >
      {icon}
      <span>Unverified Account</span>
    </span>
  );
};
