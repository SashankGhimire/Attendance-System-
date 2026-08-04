import React, { useState, useMemo } from 'react';
import { AttendanceRecord, DateFilterType } from '../types';
import {
  formatTime,
  formatTableDate,
  getTodayString,
  getYesterdayString,
  calculateHoursWorked,
  exportToCSV,
  exportToExcel,
} from '../lib/utils';
import { deleteAttendanceRecord, updateAttendanceRecord } from '../lib/supabase';
import { DataSourceState } from '../lib/supabase';
import {
  Search,
  FileSpreadsheet,
  FileText,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Radio,
  MessageSquare,
  Users,
  Pencil,
  X,
  Clock,
  Check,
  Loader2,
} from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onRecordDeleted: () => void;
  onOpenTeamManager: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  dataSourceState: DataSourceState;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  onRecordDeleted,
  onOpenTeamManager,
  onShowToast,
  dataSourceState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<'Present' | 'Late'>('Present');
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Helper to convert ISO time to datetime-local string format
  const toDatetimeLocal = (isoStr: string | null | undefined): string => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status === 'Late' ? 'Late' : 'Present');
    setEditClockIn(toDatetimeLocal(rec.clock_in));
    setEditClockOut(toDatetimeLocal(rec.clock_out));
    setEditReason(rec.reason || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSavingEdit(true);

    try {
      const clockInISO = editClockIn ? new Date(editClockIn).toISOString() : editingRecord.clock_in;
      const clockOutISO = editClockOut ? new Date(editClockOut).toISOString() : null;
      const hoursWorked = clockOutISO ? calculateHoursWorked(clockInISO, clockOutISO) : null;
      const dateStr = editClockIn ? editClockIn.split('T')[0] : editingRecord.date;

      await updateAttendanceRecord(editingRecord.id, {
        status: editStatus,
        clock_in: clockInISO,
        clock_out: clockOutISO,
        hours_worked: hoursWorked,
        reason: editReason.trim() ? editReason.trim() : null,
        date: dateStr,
      });

      onRecordDeleted(); // Trigger refresh in parent
      onShowToast('success', 'Record Updated', `Attendance for ${editingRecord.employee_name} updated successfully.`);
      setEditingRecord(null);
    } catch (e) {
      onShowToast('error', 'Update Failed', 'Could not update attendance record.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Compute filtered records based on search query and date filter
  const filteredRecords = useMemo(() => {
    const todayStr = getTodayString();
    const yesterdayStr = getYesterdayString();

    const now = new Date();
    // Start of week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return records.filter((rec) => {
      const recordDate = new Date(rec.date + 'T00:00:00');

      if (dateFilter === 'today' && rec.date !== todayStr) {
        return false;
      }
      if (dateFilter === 'yesterday' && rec.date !== yesterdayStr) {
        return false;
      }
      if (dateFilter === 'this_week' && recordDate < startOfWeek) {
        return false;
      }
      if (dateFilter === 'this_month' && recordDate < startOfMonth) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const formattedD = formatTableDate(rec.date).toLowerCase();
        const matchesName = rec.employee_name.toLowerCase().includes(q);
        const matchesDate = rec.date.includes(q) || formattedD.includes(q);
        const matchesStatus = rec.status.toLowerCase().includes(q);
        const matchesReason = rec.reason?.toLowerCase().includes(q) || false;
        return matchesName || matchesDate || matchesStatus || matchesReason;
      }

      return true;
    });
  }, [records, dateFilter, searchQuery]);

  const handleDelete = async (recordId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to delete the attendance record for ${employeeName}?`)) {
      return;
    }

    setIsDeletingId(recordId);
    try {
      await deleteAttendanceRecord(recordId);
      onRecordDeleted();
      onShowToast('success', 'Record Deleted', `Attendance log for ${employeeName} was removed.`);
    } catch (e) {
      onShowToast('error', 'Delete Failed', 'Could not delete attendance record.');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors relative">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Attendance Log
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Live record of team member clock-ins, clock-outs, and total shift hours
            </p>
          </div>

          {/* Action Buttons: Team Management & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenTeamManager}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              title="Manage Team Schedules & Add Members"
            >
              <Users className="w-4 h-4" />
              <span>Team Management</span>
            </button>

            <button
              onClick={() => {
                if (filteredRecords.length === 0) {
                  onShowToast('info', 'Export Empty', 'No records match the current filter.');
                  return;
                }
                exportToCSV(filteredRecords);
                onShowToast('success', 'CSV Exported', 'Attendance report saved as CSV.');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                if (filteredRecords.length === 0) {
                  onShowToast('info', 'Export Empty', 'No records match the current filter.');
                  return;
                }
                exportToExcel(filteredRecords);
                onShowToast('success', 'Excel Exported', 'Attendance report saved as Excel file.');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Date Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team member, date or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {(['today', 'yesterday', 'this_week', 'this_month', 'all'] as const).map((filterKey) => {
              const labels: Record<DateFilterType, string> = {
                today: 'Today',
                yesterday: 'Yesterday',
                this_week: 'This Week',
                this_month: 'This Month',
                all: 'All Records',
              };
              return (
                <button
                  key={filterKey}
                  onClick={() => setDateFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    dateFilter === filterKey
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {labels[filterKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-4 space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                No attendance logs found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Try selecting a different date range or search query.
              </p>
            </div>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isActive = !record.clock_out;

            return (
              <article
                key={record.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {record.employee_name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {formatTableDate(record.date)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                      record.status === 'Present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : record.status === 'Late'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {record.status === 'Present' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {record.status === 'Late' && <AlertCircle className="w-3.5 h-3.5" />}
                    {isActive && <Radio className="w-3 h-3 animate-pulse" />}
                    <span>{record.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Clock In</p>
                    <p className="mt-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatTime(record.clock_in, false)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Clock Out</p>
                    <p className="mt-1 font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {record.clock_out ? formatTime(record.clock_out, false) : 'In Shift'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Hours</p>
                    <p className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-100">
                      {record.hours_worked || '--'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Source</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {dataSourceState.label}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black mb-1">Reason / Note</p>
                  {record.reason ? (
                    <div className="inline-flex items-start gap-1.5 p-2 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/80 rounded-xl text-[11px] font-medium leading-relaxed whitespace-normal break-words shadow-2xs w-full">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>{record.reason}</span>
                    </div>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 font-mono text-xs">--</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenEdit(record)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Edit attendance record"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(record.id, record.employee_name)}
                    disabled={isDeletingId === record.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete attendance record"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingId === record.id ? 'Deleting' : 'Delete'}</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Main Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
              <th className="py-3.5 px-6">Team Member</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Clock In</th>
              <th className="py-3.5 px-4">Clock Out</th>
              <th className="py-3.5 px-4">Hours</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Reason / Note</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No attendance logs found
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Try selecting a different date range or search query.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isActive = !record.clock_out;

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Team Member */}
                    <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span>{record.employee_name}</span>
                      </div>
                    </td>

                    {/* Date formatted as "Aug 31, 2026" */}
                    <td className="py-4 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                      {formatTableDate(record.date)}
                    </td>

                    {/* Clock In */}
                    <td className="py-4 px-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                      {formatTime(record.clock_in, false)}
                    </td>

                    {/* Clock Out */}
                    <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                      {record.clock_out ? (
                        formatTime(record.clock_out, false)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Radio className="w-3 h-3 animate-pulse" />
                          In Shift
                        </span>
                      )}
                    </td>

                    {/* Hours Worked */}
                    <td className="py-4 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                      {record.hours_worked || '--'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          record.status === 'Present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : record.status === 'Late'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {record.status === 'Present' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {record.status === 'Late' && <AlertCircle className="w-3.5 h-3.5" />}
                        {isActive && <Radio className="w-3 h-3 animate-pulse" />}
                        <span>{record.status}</span>
                      </span>
                    </td>

                    {/* Reason / Note formatted cleanly so long notes fit */}
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 max-w-[220px]">
                      {record.reason ? (
                        <div
                          className="inline-flex items-start gap-1.5 p-2 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/80 rounded-xl text-[11px] font-medium leading-relaxed whitespace-normal break-words shadow-2xs w-full"
                          title={record.reason}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 hover:line-clamp-none transition-all">{record.reason}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-mono">--</span>
                      )}
                    </td>

                    {/* Actions: Edit & Delete Icons */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(record)}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Edit attendance record"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id, record.employee_name)}
                          disabled={isDeletingId === record.id}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete attendance record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
        <span>Showing {filteredRecords.length} records</span>
        <span>{dataSourceState.label}</span>
      </div>

      {/* Edit Attendance Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Edit Attendance Record
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {editingRecord.employee_name} ({formatTableDate(editingRecord.date)})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Attendance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('Present')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === 'Present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Present (On Time)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('Late')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === 'Late'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Late</span>
                  </button>
                </div>
              </div>

              {/* Clock In Time */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clock In Date & Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 font-mono font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Clock Out Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Clock Out Date & Time
                  </label>
                  {editClockOut && (
                    <button
                      type="button"
                      onClick={() => setEditClockOut('')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      Clear (Keep In Shift)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    placeholder="Leave empty if still on shift"
                    className="w-full pl-9 pr-3 py-2 font-mono font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Note
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Traffic delay, Overtime shift, etc."
                  className="w-full px-3 py-2 font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
