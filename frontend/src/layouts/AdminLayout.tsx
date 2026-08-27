import React from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Shield, FileCheck, AlertOctagon, Users, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/EmptyState';

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  const links = [
    { label: 'Overview Metrics', path: '/admin', icon: <Shield className="w-4 h-4" /> },
    { label: 'ID Verifications', path: '/admin/verifications', icon: <FileCheck className="w-4 h-4" /> },
    { label: 'Safety Reports', path: '/admin/reports', icon: <AlertOctagon className="w-4 h-4" /> },
    { label: 'Active SOS Monitor', path: '/admin/sos', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { label: 'User Directory', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
            <Shield className="w-4 h-4 text-amber-400" /> RouteMate Moderation Portal
          </span>
        </div>
      </header>

      {/* Main Admin Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <aside className="md:col-span-1 space-y-1 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 h-fit">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Moderation Tools
          </div>
          {links.map((link) => {
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
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Content Outlet */}
        <section className="md:col-span-3">
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
