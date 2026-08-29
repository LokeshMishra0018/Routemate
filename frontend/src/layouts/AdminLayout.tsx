import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  Shield,
  FileCheck,
  AlertOctagon,
  Users,
  ArrowLeft,
  ShieldAlert,
  Radio,
  BarChart3,
  Car,
  TrendingUp,
  Search,
  Zap,
  MessageSquare,
  Cpu,
  KeyRound,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/EmptyState';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const navigationSections = [
    {
      title: 'Real-Time Operations',
      links: [
        { label: 'Live Users Radar', path: '/admin/live', icon: <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> },
        { label: 'Overview Metrics', path: '/admin', icon: <BarChart3 className="w-4 h-4 text-amber-400" /> },
        { label: 'Trips Master Log', path: '/admin/trips', icon: <Car className="w-4 h-4 text-indigo-400" /> },
      ],
    },
    {
      title: 'Intelligence & Analytics',
      links: [
        { label: 'Funnels & Retention', path: '/admin/users-funnel', icon: <TrendingUp className="w-4 h-4 text-sky-400" /> },
        { label: 'Search Demand Radar', path: '/admin/demand', icon: <Search className="w-4 h-4 text-purple-400" /> },
        { label: 'Matching Intelligence', path: '/admin/matching', icon: <Zap className="w-4 h-4 text-pink-400" /> },
        { label: 'Commute Circles', path: '/admin/groups', icon: <MessageSquare className="w-4 h-4 text-teal-400" /> },
      ],
    },
    {
      title: 'Trust, Safety & System',
      links: [
        { label: 'ID Verifications', path: '/admin/verifications', icon: <FileCheck className="w-4 h-4 text-amber-300" /> },
        { label: 'Safety Reports', path: '/admin/reports', icon: <AlertOctagon className="w-4 h-4 text-orange-400" /> },
        { label: 'Active SOS Monitor', path: '/admin/sos', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
        { label: 'User Directory', path: '/admin/users', icon: <Users className="w-4 h-4 text-emerald-300" /> },
        { label: 'Security Password', path: '/admin/security', icon: <KeyRound className="w-4 h-4 text-amber-400" /> },
        { label: 'System Telemetry', path: '/admin/system', icon: <Cpu className="w-4 h-4 text-slate-300" /> },
      ],
    },
  ];

  const currentActivePage = navigationSections
    .flatMap((s) => s.links)
    .find((l) => (l.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(l.path)));

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Sticky Header */}
      <header className="border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-700/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Back to App</span>
          </Link>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-300 tracking-tight">
            <Shield className="w-4 h-4 text-amber-400" /> <span className="truncate">RouteMate Admin</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Telemetry
          </span>

          {/* Mobile / Tablet Navigation Toggle Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 cursor-pointer"
          >
            {isMobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Mobile Active Breadcrumb Bar */}
      <div className="md:hidden bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
          {currentActivePage?.icon}
          <span>{currentActivePage?.label || 'Command Center'}</span>
        </div>
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 hover:text-white cursor-pointer"
        >
          <span>All Modules</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile / Tablet Slide-Out Navigation Drawer */}
      {isMobileDrawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="md:hidden fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-slate-900 border-l border-slate-800 p-5 space-y-6 z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="flex items-center gap-2 text-sm font-black text-amber-300">
                <Shield className="w-4 h-4 text-amber-400" /> Admin Navigation
              </span>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {navigationSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                {section.links.map((link) => {
                  const isActive =
                    link.path === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </aside>
        </>
      )}

      {/* Main Admin Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:block md:col-span-1 space-y-5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 h-fit sticky top-20">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              {section.links.map((link) => {
                const isActive =
                  link.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Content Outlet (Full width on Mobile & Tablet, 3-column on Desktop) */}
        <section className="col-span-1 md:col-span-3 min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Verifying permissions..." />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'moderator' && user?.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
