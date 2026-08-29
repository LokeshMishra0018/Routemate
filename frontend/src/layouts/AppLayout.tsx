import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { usePresenceTracker } from '../lib/usePresenceTracker';

export const AppLayout: React.FC = () => {
  usePresenceTracker();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} RouteMate. Smart Campus Travel & Mobility.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Verified Student Network</span>
            <span>•</span>
            <span>Safety-First Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
