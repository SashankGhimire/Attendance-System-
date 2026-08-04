import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord } from '../types';
import {
  formatShiftTime,
  formatTime,
  formatDate,
  determineClockInStatus,
  calculateHoursWorked,
  getTodayString,
  checkClockInTiming,
  checkClockOutTiming,
  hasShiftTimePassed,
} from '../lib/utils';
import { recordClockIn, recordClockOut, reclockRecord } from '../lib/supabase';
import { ReasonModal } from './ReasonModal';
import {
  LogIn,
  LogOut,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  PartyPopper,
  Check,
  Loader2,
  Award,
  X,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface EmployeeCardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  currentTime: Date;
  onRecordChange: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employees,
  attendanceRecords,
  currentTime,
  onRecordChange,
  onShowToast,
}) => {
  // Currently selected team member ID
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || 'emp-1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessAnim, setActionSuccessAnim] = useState<'in' | 'out' | 'reclock' | null>(null);

  // Reason Modal State
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    timingType: 'early_in' | 'late_in' | 'early_out' | 'late_out' | 'reclock';
    onConfirm: (reason: string) => Promise<void>;
  } | null>(null);

  // Sync selected team member ID if current selection is invalid or when list loads
  useEffect(() => {
    if (employees.length > 0 && !employees.some(e => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  // Fallback UI if no team member is available
  if (!selectedEmployee) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <User className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Loading Team Profiles...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please wait while team data is synchronized.</p>
      </div>
    );
  }

  const todayStr = getTodayString(currentTime);

  // Find today's attendance record for the selected team member
  const todayRecord = attendanceRecords.find(
    r => r.employee_id === selectedEmployeeId && r.date === todayStr
  );

  // Status computation
  const isClockedIn = !!todayRecord && !todayRecord.clock_out;
  const isClockedOut = !!todayRecord && !!todayRecord.clock_out;
  const shiftTimePassed = hasShiftTimePassed(
    currentTime,
    selectedEmployee.shift_start,
    selectedEmployee.shift_end
  );

  let currentStatusText = 'Not Clocked In';
  let currentStatusBadgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (isClockedIn) {
    if (todayRecord.status === 'Late') {
      currentStatusText = `Late (Clocked in at ${formatTime(todayRecord.clock_in, false)})`;
      currentStatusBadgeClass = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    } else {
      currentStatusText = `Present (Clocked in at ${formatTime(todayRecord.clock_in, false)})`;
      currentStatusBadgeClass = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  } else if (isClockedOut) {
    currentStatusText = `Completed (${todayRecord.hours_worked || 'Done'})`;
    currentStatusBadgeClass = 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }

  // Core Execution of Clock In with Reason
  const executeClockIn = async (reason?: string) => {
    setIsProcessing(true);
    setActionSuccessAnim(null);
    try {
      const now = new Date();
      const detectedStatus = determineClockInStatus(now, selectedEmployee.shift_start);

      await recordClockIn(selectedEmployee, detectedStatus, reason);
      onRecordChange();
      setActionSuccessAnim('in');

      onShowToast(
        'success',
        'Clock In Recorded!',
        `${selectedEmployee.name} clocked in at ${formatTime(now, false)} (${detectedStatus})${
          reason ? ` - ${reason}` : ''
        }`
      );

      setTimeout(() => setActionSuccessAnim(null), 3500);
    } catch (err) {
      onShowToast('error', 'Clock In Failed', 'Could not record attendance. Please try again.');
    } finally {
      setIsProcessing(false);
      setReasonModalState(null);
    }
  };

  // Click Handler for Clock In
  const handleClockInClick = () => {
    if (isClockedIn || isClockedOut || isProcessing) return;

    const timing = checkClockInTiming(currentTime, selectedEmployee.shift_start);
    if (timing === 'early') {
      setReasonModalState({
        isOpen: true,
        title: 'Early Clock-In Reason',
        subtitle: `You are clocking in early (Shift starts at ${formatShiftTime(selectedEmployee.shift_start)}). Please specify why.`,
        timingType: 'early_in',
        onConfirm: executeClockIn,
      });
    } else if (timing === 'late') {
      setReasonModalState({
        isOpen: true,
        title: 'Late Clock-In Reason',
        subtitle: `Clocking in past shift start time (${formatShiftTime(selectedEmployee.shift_start)}). Please provide a reason.`,
        timingType: 'late_in',
        onConfirm: executeClockIn,
      });
    } else {
      executeClockIn();
    }
  };

  // Core Execution of Clock Out with Reason
  const executeClockOut = async (reason?: string) => {
    if (!todayRecord) return;
    setIsProcessing(true);
    setActionSuccessAnim(null);
    try {
      const nowISO = new Date().toISOString();
      const hoursWorked = calculateHoursWorked(todayRecord.clock_in, nowISO);

      await recordClockOut(todayRecord.id, nowISO, hoursWorked, reason);
      onRecordChange();
      setActionSuccessAnim('out');

      onShowToast(
        'success',
        'Clock Out Recorded!',
        `${selectedEmployee.name} clocked out. Duration: ${hoursWorked}${reason ? ` (${reason})` : ''}`
      );

      setTimeout(() => setActionSuccessAnim(null), 3500);
    } catch (err) {
      onShowToast('error', 'Clock Out Failed', 'Could not update record. Please try again.');
    } finally {
      setIsProcessing(false);
      setReasonModalState(null);
    }
  };

  // Click Handler for Clock Out
  const handleClockOutClick = () => {
    if (!todayRecord || !isClockedIn || isProcessing) return;

    const timing = checkClockOutTiming(currentTime, selectedEmployee.shift_end);
    if (timing === 'early') {
      setReasonModalState({
        isOpen: true,
        title: 'Early Clock-Out Reason',
        subtitle: `You are clocking out before shift end time (${formatShiftTime(selectedEmployee.shift_end)}). Please provide a reason.`,
        timingType: 'early_out',
        onConfirm: executeClockOut,
      });
    } else if (timing === 'late') {
      setReasonModalState({
        isOpen: true,
        title: 'Overtime / Late Clock-Out Reason',
        subtitle: `Clocking out past shift end time (${formatShiftTime(selectedEmployee.shift_end)}). Please log reason or overtime note.`,
        timingType: 'late_out',
        onConfirm: executeClockOut,
      });
    } else {
      executeClockOut();
    }
  };

  // Handler for Reclock Shift
  const handleReclockClick = () => {
    setReasonModalState({
      isOpen: true,
      title: 'Reclock Shift',
      subtitle: 'Re-open today’s shift or record a fresh clock-in session.',
      timingType: 'reclock',
      onConfirm: async (reason: string) => {
        setIsProcessing(true);
        setActionSuccessAnim(null);
        try {
          if (todayRecord) {
            await reclockRecord(todayRecord.id, reason);
          } else {
            const status = determineClockInStatus(new Date(), selectedEmployee.shift_start);
            await recordClockIn(selectedEmployee, status, `Reclock: ${reason}`);
          }
          onRecordChange();
          setActionSuccessAnim('reclock');

          onShowToast(
            'success',
            'Shift Re-clocked!',
            `${selectedEmployee.name} has re-opened their shift timestamp.`
          );

          setTimeout(() => setActionSuccessAnim(null), 3500);
        } catch (err) {
          onShowToast('error', 'Reclock Failed', 'Could not update shift record.');
        } finally {
          setIsProcessing(false);
          setReasonModalState(null);
        }
      },
    });
  };

  // Handler for Overtime Clock In
  const handleOvertimeClockInClick = () => {
    setReasonModalState({
      isOpen: true,
      title: 'Overtime Clock-In Reason',
      subtitle: `Clocking in for an extra overtime session today (${selectedEmployee.name}). Please enter a reason or note.`,
      timingType: 'late_out',
      onConfirm: async (reason: string) => {
        setIsProcessing(true);
        setActionSuccessAnim(null);
        try {
          await recordClockIn(selectedEmployee, 'Present', `Overtime Shift: ${reason}`);
          onRecordChange();
          setActionSuccessAnim('in');
          onShowToast(
            'success',
            'Overtime Clock-In Recorded!',
            `${selectedEmployee.name} is now clocked in for an overtime session.`
          );
          setTimeout(() => setActionSuccessAnim(null), 3500);
        } catch (err) {
          onShowToast('error', 'Clock-In Failed', 'Could not record overtime clock-in.');
        } finally {
          setIsProcessing(false);
          setReasonModalState(null);
        }
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 px-2 sm:px-0 sm:space-y-6">
      {/* Reason Prompt Modal */}
      {reasonModalState && (
        <ReasonModal
          isOpen={reasonModalState.isOpen}
          title={reasonModalState.title}
          subtitle={reasonModalState.subtitle}
          timingType={reasonModalState.timingType}
          onSubmit={reasonModalState.onConfirm}
          onCancel={() => setReasonModalState(null)}
        />
      )}

      {/* Celebration Pop Overlay Modal */}
      {actionSuccessAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 dark:border-slate-800 animate-pop-scale overflow-hidden">
            {/* Confetti Particles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="absolute w-4 h-4 rounded-full bg-emerald-500 animate-particle-1" />
              <div className="absolute w-3.5 h-3.5 rounded-full bg-blue-500 animate-particle-2" />
              <div className="absolute w-4 h-4 rounded-full bg-indigo-500 animate-particle-3" />
              <div className="absolute w-3 h-3 rounded-full bg-amber-400 animate-particle-4" />
              <div className="absolute w-5 h-5 rounded-full bg-purple-500 animate-particle-5" />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setActionSuccessAnim(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Banner */}
            <div className="relative inline-flex mb-4">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${
                  actionSuccessAnim === 'in'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30'
                    : actionSuccessAnim === 'reclock'
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-500/30'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/30'
                }`}
              >
                {actionSuccessAnim === 'in' ? (
                  <PartyPopper className="w-10 h-10 stroke-[2.2] animate-bounce" />
                ) : actionSuccessAnim === 'reclock' ? (
                  <RotateCcw className="w-10 h-10 stroke-[2.2] animate-spin" />
                ) : (
                  <Award className="w-10 h-10 stroke-[2.2] animate-bounce" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full shadow-md">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              </div>
            </div>

            {/* Headlines */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {actionSuccessAnim === 'in'
                  ? 'Clock In Recorded!'
                  : actionSuccessAnim === 'reclock'
                  ? 'Shift Re-clocked!'
                  : 'Clock Out Recorded!'}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1">
              {selectedEmployee.name}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
              {actionSuccessAnim === 'in'
                ? `Successfully clocked in for today's shift at ${formatTime(currentTime, false)}.`
                : actionSuccessAnim === 'reclock'
                ? `Shift reset & active! Timestamp updated at ${formatTime(currentTime, false)}.`
                : `Shift completed! Timestamp logged at ${formatTime(currentTime, false)}.`}
            </p>

            <button
              onClick={() => setActionSuccessAnim(null)}
              className="w-full py-3 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Continue Work
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Live Clock Card (Styled for light and dark modes) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900 shadow-2xs">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Live Workspace
            </span>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              Attendance Terminal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(currentTime)}</span>
            </p>
          </div>
        </div>

        {/* Live Clock Display Box - Responsive Light/Dark */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-6 py-3 rounded-2xl text-center min-w-[180px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Current Time
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono tracking-tight">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Main Team Member Attendance Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 relative overflow-hidden space-y-6 transition-colors">
        {/* Team Member Selector */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Select Team Member
          </label>
          <div className="relative">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full appearance-none bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold rounded-2xl pl-12 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} className="dark:bg-slate-900 dark:text-slate-100">
                  {emp.name} (Shift: {formatShiftTime(emp.shift_start)} - {formatShiftTime(emp.shift_end)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Team Member Header */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{selectedEmployee.name}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Shift: {formatShiftTime(selectedEmployee.shift_start)} – {formatShiftTime(selectedEmployee.shift_end)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Shift Schedule
            </span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900 shadow-2xs mt-1">
              {formatShiftTime(selectedEmployee.shift_start)} – {formatShiftTime(selectedEmployee.shift_end)}
            </span>
          </div>
        </div>

        {/* Current Status Row */}
        <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Today's Status
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${currentStatusBadgeClass}`}
          >
            {isClockedIn ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isClockedOut ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{currentStatusText}</span>
          </span>
        </div>

        {/* Reason Note Indicator if present on today's record */}
        {todayRecord?.reason && (
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Note logged:</strong> "{todayRecord.reason}"
            </span>
          </div>
        )}

        {/* Action Buttons: Clock In & Clock Out */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Clock In or Overtime Clock In Button */}
          {!isClockedIn && shiftTimePassed ? (
            <button
              onClick={handleOvertimeClockInClick}
              disabled={isProcessing}
              className="group relative overflow-hidden flex items-center justify-center gap-3 h-16 px-6 rounded-2xl font-bold text-base transition-all duration-300 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 transition-transform group-hover:scale-110" />
              )}
              <span>{isProcessing ? 'Recording...' : 'Clock In (Overtime)'}</span>
            </button>
          ) : (
            <button
              onClick={handleClockInClick}
              disabled={isClockedIn || isProcessing}
              className={`group relative overflow-hidden flex items-center justify-center gap-3 h-16 px-6 rounded-2xl font-bold text-base transition-all duration-300 cursor-pointer ${
                isClockedIn
                  ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5 transition-transform group-hover:scale-110" />
              )}
              <span>{isProcessing ? 'Recording...' : 'Clock In'}</span>
            </button>
          )}

          {/* Clock Out Button */}
          <button
            onClick={handleClockOutClick}
            disabled={!isClockedIn || isClockedOut || isProcessing}
            className={`group relative overflow-hidden flex items-center justify-center gap-3 h-16 px-6 rounded-2xl font-bold text-base transition-all duration-300 cursor-pointer ${
              !isClockedIn || isClockedOut
                ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed opacity-60'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
            )}
            <span>{isProcessing ? 'Updating...' : 'Clock Out'}</span>
          </button>
        </div>

        {/* Reclock Shift Option if team member clocked out or needs re-entry */}
        {todayRecord && (
          <div className="pt-2">
            <button
              onClick={handleReclockClick}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Reclock Shift (Reset or Re-open Timestamp)</span>
            </button>
          </div>
        )}

        {/* Tip / Footer Note */}
        <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-xs font-medium text-blue-900 dark:text-blue-300 text-center">
          {isClockedIn
            ? 'Shift active! Click Clock Out when concluding your work today.'
            : shiftTimePassed
            ? 'Scheduled shift time has passed for today. Click "Clock In (Overtime)" to record extra shift hours.'
            : 'Select your name and click Clock In to record attendance.'}
        </div>
      </div>
    </div>
  );
};
