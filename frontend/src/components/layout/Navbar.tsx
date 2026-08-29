import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Users,
  MessageSquare,
  Bell,
  Shield,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  FileCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Badge';
import { TrustBadge } from '../common/TrustBadge';
import { Button } from '../ui/Button';
import { TrustScoreMeter } from '../ui/TrustScoreMeter';

export const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: <Compass className="w-4 h-4" /> },
    { label: 'Trips', path: '/trips', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Matches', path: '/matches', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { label: 'Connections', path: '/connections', icon: <Users className="w-4 h-4" /> },
    { label: 'Groups', path: '/groups', icon: <Users className="w-4 h-4 text-sky-400" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Safety Hub', path: '/safety', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
  ];

  // Primary bottom navigation dock items for smartphones
  const mobileDockLinks = [
    { label: 'Home', path: '/dashboard', icon: <Compass className="w-5 h-5" /> },
    { label: 'Trips', path: '/trips', icon: <MapPin className="w-5 h-5" /> },
    { label: 'Matches', path: '/matches', icon: <Zap className="w-5 h-5 text-amber-400" /> },
    { label: 'Chat', path: '/messages', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
  ];

  const isModeratorOrAdmin = user?.role === 'moderator' || user?.role === 'admin';

  return (
    <>
      {/* ================= Top Sticky Header ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-slate-950/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 focus:outline-none shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-glow">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                Route<span className="text-indigo-400">Mate</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Campus Mobility
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {isModeratorOrAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Portal</span>
              </Link>
            )}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick SOS Trigger Button */}
            <Link to="/safety">
              <Button
                size="sm"
                variant="sos"
                className="text-xs px-2.5 sm:px-3 py-1 shadow-glow-sos font-black flex items-center gap-1"
                leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
              >
                SOS
              </Button>
            </Link>

            {/* Notifications link */}
            <Link
              to="/notifications"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>

            {/* User Profile Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700 cursor-pointer"
              >
                <Avatar
                  name={profile?.fullName || user?.email}
                  src={profile?.avatarUrl}
                  size="sm"
                  role={user?.role}
                  verified={profile?.verificationStatus === 'approved'}
                />
                <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                  <span className="truncate">{profile?.fullName || user?.email?.split('@')[0]}</span>
                  <TrustBadge
                    role={user?.role}
                    tier={profile?.verificationTier || (profile?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                    iconOnly
                    size="xs"
                  />
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Desktop Profile Dropdown Popover */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-slate-800">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {profile?.fullName || (user?.role === 'admin' ? 'Campus Admin' : user?.role === 'moderator' ? 'Campus Moderator' : 'Student')}
                        </p>
                        <TrustBadge
                          role={user?.role}
                          tier={profile?.verificationTier || (profile?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                          size="xs"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                      <div className="mt-2.5">
                        <TrustScoreMeter score={profile?.trustScore || 0} size="sm" />
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-indigo-400" />
                        <span>My Profile & Reviews</span>
                      </Link>

                      <Link
                        to="/verification"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span>Student ID Verification</span>
                      </Link>

                      {isModeratorOrAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors"
                        >
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span>Admin Moderation Portal</span>
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile / Tablet Menu Button (For More Options) */}
            <button
              onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
              aria-label="Toggle navigation drawer"
            >
              {isMobileDrawerOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Slide-Down Mobile Drawer Menu */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              <Link
                to="/verification"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 hover:text-white"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Student ID Verification</span>
              </Link>

              {isModeratorOrAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin Moderation Portal</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= Mobile Bottom Floating Dock ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/90 py-1.5 px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {mobileDockLinks.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-indigo-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
