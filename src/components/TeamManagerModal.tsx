import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Edit2,
  Trash2,
  Users,
  Clock,
  Check,
  AlertTriangle,
  Sparkles,
  Shield,
  User,
  Save,
} from 'lucide-react';
import { Employee } from '../types';
import { addEmployee, updateEmployee, deleteEmployee } from '../lib/supabase';
import { formatShiftTime } from '../lib/utils';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onEmployeesChange: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onEmployeesChange,
  onShowToast,
}) => {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State (Name, Shift Start, Shift End - role removed as requested)
  const [name, setName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setShiftStart('09:00');
    setShiftEnd('17:00');
    setEditingEmployee(null);
    setIsAdding(false);
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsAdding(false);
    setName(emp.name);
    setShiftStart(emp.shift_start);
    setShiftEnd(emp.shift_end);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('error', 'Missing Name', 'Please enter a team member name');
      return;
    }

    try {
      if (editingEmployee) {
        await updateEmployee({
          ...editingEmployee,
          name: name.trim(),
          shift_start: shiftStart,
          shift_end: shiftEnd,
        });
        onShowToast(
          'success',
          'Schedule Updated!',
          `Updated shift for ${name.trim()} (${formatShiftTime(shiftStart)} - ${formatShiftTime(shiftEnd)})`
        );
      } else {
        await addEmployee({
          name: name.trim(),
          shift_start: shiftStart,
          shift_end: shiftEnd,
        });
        onShowToast(
          'success',
          'Member Added!',
          `Added ${name.trim()} to active roster with shift ${formatShiftTime(shiftStart)} - ${formatShiftTime(shiftEnd)}`
        );
      }
      resetForm();
      onEmployeesChange();
    } catch (err) {
      onShowToast('error', 'Action Failed', 'Could not update employee schedule');
    }
  };

  const handleDelete = async (id: string, empName: string) => {
    try {
      await deleteEmployee(id);
      setDeleteConfirmId(null);
      onShowToast('info', 'Member Removed', `Removed ${empName} from team roster`);
      onEmployeesChange();
    } catch (err) {
      onShowToast('error', 'Delete Failed', 'Could not delete team member');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-2xl w-full my-8 overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="px-6 py-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Team Shift Management</h3>
              <p className="text-xs text-slate-400">Manage team roster and shift schedules in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Active Team Roster ({employees.length})</span>
            </div>

            {!isAdding && !editingEmployee && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
            )}
          </div>

          {/* Add / Edit Shift Form */}
          {(isAdding || editingEmployee) && (
            <form
              onSubmit={handleSubmit}
              className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800/80 rounded-2xl space-y-4 animate-pop-scale shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {editingEmployee ? `Edit Shift: ${editingEmployee.name}` : 'Add New Team Member'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Member Name */}
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Team Member Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="E.g. Sabin, Charlie..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Shift Start Time */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftStart}
                    onChange={e => setShiftStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                  />
                </div>

                {/* Shift End Time */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftEnd}
                    onChange={e => setShiftEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-blue-100 dark:border-blue-900/60">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                  Shift duration: {formatShiftTime(shiftStart)} – {formatShiftTime(shiftEnd)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingEmployee ? 'Save Schedule' : 'Create Member'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Team Member Roster List */}
          <div className="space-y-3">
            {employees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Team Members Found</p>
                <p className="text-xs text-slate-400 mt-0.5">Click "Add Team Member" above to create your roster.</p>
              </div>
            ) : (
              employees.map(emp => {
                const isConfirmingDelete = deleteConfirmId === emp.id;
                return (
                  <div
                    key={emp.id}
                    className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-100 dark:border-blue-800 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{emp.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="inline-flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800/60">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>Shift: {formatShiftTime(emp.shift_start)} – {formatShiftTime(emp.shift_end)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 animate-pop-scale">
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300 px-1">
                            Delete member?
                          </span>
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="px-3 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(emp)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 rounded-xl transition-all cursor-pointer"
                            title="Edit member shift start and end times"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Shift</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(emp.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                            title="Delete member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
