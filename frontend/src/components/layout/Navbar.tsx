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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: <Compass className="w-4 h-4" /> },
    { label: 'Trips', path: '/trips', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Matches', path: '/matches', icon: <Users className="w-4 h-4" /> },
    { label: 'Connections', path: '/connections', icon: <Users className="w-4 h-4" /> },
    { label: 'Groups', path: '/groups', icon: <Users className="w-4 h-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Safety Hub', path: '/safety', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
  ];

  const isModeratorOrAdmin = user?.role === 'moderator' || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 focus:outline-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-glow">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white leading-none">
              Route<span className="text-indigo-400">Mate</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Campus Mobility</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick SOS Trigger link */}
          <Link to="/safety">
            <Button
              size="sm"
              variant="sos"
              className="text-xs px-3 py-1 shadow-glow-sos"
              leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
            >
              SOS
            </Button>
          </Link>

          {/* Notifications link */}
          <Link
            to="/notifications"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700"
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

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
          {isModeratorOrAdmin && (
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-300 bg-amber-950/30"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin Portal</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
