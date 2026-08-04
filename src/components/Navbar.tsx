import React from 'react';
import {
  Clock,
  Shield,
  LogOut,
  LayoutDashboard,
  UserCheck,
  Database,
  Sun,
  Moon,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { AdminUser } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  currentTime: Date;
  admin: AdminUser;
  activeTab: 'employee' | 'admin';
  isDarkMode: boolean;
  onTabChange: (tab: 'employee' | 'admin') => void;
  onToggleDarkMode: () => void;
  onOpenAdminModal: () => void;
  onAdminLogout: () => void;
  onOpenSidePanel: () => void;
  onOpenTeamManager: () => void;
  onReplaySplash: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTime,
  admin,
  activeTab,
  isDarkMode,
  onTabChange,
  onToggleDarkMode,
  onOpenAdminModal,
  onAdminLogout,
  onOpenSidePanel,
  onOpenTeamManager,
  onReplaySplash,
}) => {
  const isSupabaseLive = isSupabaseConfigured();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={onReplaySplash}
              title="Click to replay splash screen"
              className="flex items-center gap-2.5 group cursor-pointer text-left"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-800 dark:text-slate-100">
                WorkFlow <span className="text-blue-600 dark:text-blue-400">Attendance</span>
              </span>
            </button>

            {/* Supabase connection indicator pill */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isSupabaseLive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title={
                isSupabaseLive
                  ? 'Connected to Supabase Realtime Database'
                  : 'Running in local reactive mode (Supabase keys not detected)'
              }
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseLive ? 'Supabase Connected' : 'Local Storage Mode'}</span>
            </div>
          </div>

          {/* Center Navigation Tabs (when Admin is logged in) */}
          {admin.authenticated && (
            <div className="order-3 flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto justify-center sm:justify-start">
              <button
                onClick={() => onTabChange('employee')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-none justify-center ${
                  activeTab === 'employee'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Clock Station</span>
              </button>
              <button
                onClick={() => onTabChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-none justify-center ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </button>
            </div>
          )}

          {/* Right Controls */}
          <div className="order-2 flex flex-wrap items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Dark Theme Toggle Button */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Admin Side Panel Button (when Admin logged in) */}
            {admin.authenticated && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenSidePanel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 rounded-xl transition-all cursor-pointer"
                  title="Open Resets & System Panel"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">System Panel</span>
                </button>
              </div>
            )}

            {/* Live Clock Display (Desktop) */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {formattedDate}
              </span>
              <span className="text-[11px] text-slate-400 font-medium font-mono">
                {formattedTime}
              </span>
            </div>

            {/* Admin Login / Logout */}
            {admin.authenticated ? (
              <>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer"
                  title="Logout Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>

                {showLogoutConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="relative max-w-md w-full overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-pop-scale">
                      <div className="px-6 pt-6 pb-5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/30 mb-2">
                              Logout Confirmation
                            </span>
                            <h3 className="text-xl font-black tracking-tight text-white">Are you sure you want to logout?</h3>
                            <p className="text-xs text-slate-300 font-medium mt-2 leading-relaxed">
                              You will return to the employee view and admin-only controls will be locked.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 flex items-center justify-end gap-3">
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setShowLogoutConfirm(false);
                            onAdminLogout();
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onOpenAdminModal}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
