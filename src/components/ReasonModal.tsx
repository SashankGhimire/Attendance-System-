import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Clock,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface ReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  timingType: 'clock_in' | 'early_in' | 'late_in' | 'clock_out' | 'early_out' | 'late_out' | 'reclock';
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

const PRESET_REASONS: Record<ReasonModalProps['timingType'], string[]> = {
  clock_in: [
    'Starting Scheduled Shift',
    'Approved Team Coverage',
    'Project Work',
    'Manager Direct Request',
  ],
  early_in: [
    'Approved Team Coverage',
    'Early Shift Prep & Setup',
    'Project Deadline / Launch',
    'Manager Direct Request',
  ],
  late_in: [
    'Approved Team Coverage',
    'Traffic / Transit Delays',
    'Personal / Family Emergency',
    'Medical Appointment',
  ],
  clock_out: [
    'Scheduled Shift Complete',
    'All Assigned Tasks Complete',
    'Approved Team Handover',
    'Manager Direct Request',
  ],
  early_out: [
    'Approved Team Coverage',
    'Approved Early Leave',
    'Medical / Doctor Appointment',
    'Personal Emergency',
    'All Assigned Tasks Complete',
  ],
  late_out: [
    'Approved Team Coverage',
    'Approved Overtime Work',
    'Covering Team Member Shift',
  ],
  reclock: [
    'Approved Team Coverage',
    'Accidental Clock-Out Adjustment',
    'Second Shift Session Today',
    'Shift Re-opening / Correction',
  ],
};

const TIMING_CONFIGS: Record<
  ReasonModalProps['timingType'],
  { badge: string; colorClass: string; bgGradient: string; icon: React.ReactNode }
> = {
  clock_in: {
    badge: 'Clock-In',
    colorClass: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    bgGradient: 'from-blue-600 to-indigo-600',
    icon: <Clock className="w-5 h-5 text-white" />,
  },
  early_in: {
    badge: 'Early Clock-In',
    colorClass: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    bgGradient: 'from-emerald-600 to-teal-600',
    icon: <Zap className="w-5 h-5 text-white" />,
  },
  late_in: {
    badge: 'Late Clock-In',
    colorClass: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    bgGradient: 'from-amber-500 to-orange-600',
    icon: <Clock className="w-5 h-5 text-white" />,
  },
  clock_out: {
    badge: 'Clock-Out',
    colorClass: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    bgGradient: 'from-blue-600 to-indigo-600',
    icon: <Clock className="w-5 h-5 text-white" />,
  },
  early_out: {
    badge: 'Early Clock-Out',
    colorClass: 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
    bgGradient: 'from-rose-500 to-red-600',
    icon: <AlertTriangle className="w-5 h-5 text-white" />,
  },
  late_out: {
    badge: 'Overtime / Late Clock-Out',
    colorClass: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    bgGradient: 'from-blue-600 to-indigo-600',
    icon: <Sparkles className="w-5 h-5 text-white" />,
  },
  reclock: {
    badge: 'Shift Reclock',
    colorClass: 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    bgGradient: 'from-purple-600 to-indigo-600',
    icon: <RotateCcw className="w-5 h-5 text-white" />,
  },
};

export const ReasonModal: React.FC<ReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  timingType,
  onSubmit,
  onCancel,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const isReasonProvided = selectedPreset.length > 0 || customReason.trim().length > 0;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonProvided) return;
    const finalReason = customReason.trim() || selectedPreset;
    onSubmit(finalReason);
  };

  const config = TIMING_CONFIGS[timingType] || TIMING_CONFIGS.early_in;
  const presets = PRESET_REASONS[timingType] || PRESET_REASONS.early_in;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-all transform animate-pop-scale">
        {/* Header Bar */}
        <div className="relative px-6 pt-6 pb-5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${config.bgGradient} flex items-center justify-center shadow-lg shadow-slate-950/40 shrink-0`}
              >
                {config.icon}
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-1 ${config.colorClass}`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{config.badge}</span>
                </span>
                <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {subtitle && (
            <p className="text-xs text-slate-300 font-medium mt-3 leading-relaxed bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset Reasons Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Select Reason
              </label>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Click to pick</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map(preset => {
                const isSelected = selectedPreset === preset && !customReason;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset);
                      setCustomReason('');
                    }}
                    className={`group text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="truncate">{preset}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Reason Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Or Write Custom Coverage Note
              </label>
              {customReason && (
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Custom note active</span>
              )}
            </div>

            <div className="relative">
              <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <textarea
                rows={2}
                value={customReason}
                onChange={e => {
                  setCustomReason(e.target.value);
                  if (e.target.value) setSelectedPreset('');
                }}
                placeholder="E.g., Approved team coverage by manager..."
                className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 dark:text-slate-100 transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>This coverage note will be saved in team logs for admin verification.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isReasonProvided}
              className="group flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              <span>Confirm & Record Timestamp</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
