import React from 'react';
import { AttendanceRecord, Employee } from '../types';
import { getTodayString, formatTime, formatDate } from '../lib/utils';
import { UserCheck, Clock, AlertTriangle, CheckCircle, User, MessageSquare } from 'lucide-react';

interface DashboardCardsProps {
  records: AttendanceRecord[];
  employees: Employee[];
  currentTime: Date;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  records,
  employees,
  currentTime,
}) => {
  const todayStr = getTodayString(currentTime);

  // Filter today's records
  const todayRecords = records.filter(r => r.date === todayStr);

  const presentTodayCount = todayRecords.filter(r => r.status === 'Present').length;
  const lateTodayRecords = todayRecords.filter(r => r.status === 'Late');
  const lateTodayCount = lateTodayRecords.length;
  
  // List of team members currently working (clocked in and not clocked out yet)
  const currentlyWorkingRecords = todayRecords.filter(r => !r.clock_out);
  const currentlyWorkingCount = currentlyWorkingRecords.length;
  const completedTodayCount = todayRecords.filter(r => !!r.clock_out).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Stat Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Present Today */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
              Present Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{presentTodayCount}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">On Time</span>
          </div>
        </div>

        {/* Card 2: Late Today */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
              Late Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{lateTodayCount}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">Delayed</span>
          </div>
        </div>

        {/* Card 3: Completed Shift */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
              Completed Shift
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{completedTodayCount}</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">Clocked Out</span>
          </div>
        </div>

        {/* Card 4: Live Terminal */}
        <div className="bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border border-slate-200/80 dark:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-[0.15em]">
              Live Terminal
            </span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
              {formatTime(currentTime)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Roster Panels: Currently Working & Late Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Currently Working Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Currently Working ({currentlyWorkingCount})
              </h4>
            </div>
            <span className="text-xs font-medium text-slate-400">Shift Roster</span>
          </div>

          {currentlyWorkingRecords.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
              No team members are currently clocked in.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {currentlyWorkingRecords.map(rec => (
                <div
                  key={rec.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <span>{rec.employee_name}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-300 font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                    {formatTime(rec.clock_in, false)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Late Today Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Late Today ({lateTodayCount})
              </h4>
            </div>
            <span className="text-xs font-medium text-slate-400">Delayed Arrivals</span>
          </div>

          {lateTodayRecords.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
              No late arrivals recorded today. All on time!
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {lateTodayRecords.map(rec => (
                <div
                  key={rec.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <span>{rec.employee_name}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-300 font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {formatTime(rec.clock_in, false)}
                  </span>
                  {rec.reason && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-normal italic flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      {rec.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
