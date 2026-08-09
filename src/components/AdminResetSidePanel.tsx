import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Trash2,
  Database,
  Users,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';
import { clearAllAttendanceRecords, isSupabaseConfigured } from '../lib/supabase';

interface AdminResetSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  employees: Employee[];
  onDataReset: () => void;
  onOpenTeamManager: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminResetSidePanel = React.memo(function AdminResetSidePanel({
  isOpen,
  onClose,
  records,
  employees,
  onDataReset,
  onOpenTeamManager,
  onShowToast,
}: AdminResetSidePanelProps) {
  const [confirmingClearLogs, setConfirmingClearLogs] = useState(false);

  if (!isOpen) return null;

  const handleClearLogs = async () => {
    try {
      await clearAllAttendanceRecords();
      setConfirmingClearLogs(false);
      onDataReset();
      onShowToast('info', 'Logs Cleared', 'All attendance records have been reset');
    } catch (err) {
      onShowToast('error', 'Reset Failed', 'Unable to clear attendance records');
    }
  };

  const isSupabaseLive = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      {/* Drawer Overlay Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Side Drawer Body */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-transform animate-slide-left">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">System & Control Panel</h3>
              <p className="text-xs text-slate-400">Database health & workspace maintenance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* Quick Diagnostics */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                System Diagnostics
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isSupabaseLive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {isSupabaseLive ? 'Supabase Realtime' : 'Local Storage Mode'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Logs</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{records.length}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Active Team</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{employees.length}</span>
              </div>
            </div>
          </div>

          {/* Action 1: Team Roster Control */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Team Management
            </h4>

            <button
              onClick={() => {
                onClose();
                onOpenTeamManager();
              }}
              className="w-full p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Manage Team Schedules</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add members & adjust shift times live</p>
                </div>
              </div>
            </button>
          </div>

          {/* Action 2: Data Resets & Logs Clear */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Database Maintenance
            </h4>

            {/* Clear Attendance Logs */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-4 shadow-2xs">
              <div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Wipe Attendance Logs & Hours</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Erases all recorded clock-in/out timestamps and hours worked. Team member profiles and shift schedule times are preserved intact.
                </p>
              </div>

              {confirmingClearLogs ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-3 animate-pop-scale">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Confirm wiping all attendance logs? (Schedules stay safe)</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleClearLogs}
                      className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all cursor-pointer shadow-md shadow-rose-500/20"
                    >
                      Confirm Clear Logs
                    </button>
                    <button
                      onClick={() => setConfirmingClearLogs(false)}
                      className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingClearLogs(true)}
                  className="w-full py-3 px-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/60 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Erase Attendance Logs & Hours</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-[11px] text-slate-400 font-medium">WorkFlow Attendance • Administrator Control</p>
        </div>
      </div>
    </div>
  );
});
