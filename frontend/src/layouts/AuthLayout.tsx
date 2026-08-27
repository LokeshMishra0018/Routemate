import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Compass, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/login" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-glow transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">
              Route<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Mate</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Campus Mobility</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verified Student Commuters Only</span>
        </div>
      </header>

      {/* Main Form container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children || <Outlet />}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>© 2026 RouteMate. Student Safety & Verified Campus Rides Network.</p>
      </footer>
    </div>
  );
};
