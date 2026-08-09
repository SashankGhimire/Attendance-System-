import React, { useEffect, useState, useRef } from 'react';
import { Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // duration in ms, default 1800ms
}

export const SplashScreen = React.memo(function SplashScreen({ onComplete, duration = 1800 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        if (completionTimerRef.current) {
          clearTimeout(completionTimerRef.current);
        }
        completionTimerRef.current = setTimeout(() => {
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }, 100);
      }
    }, 25);

    return () => {
      clearInterval(interval);
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, [duration]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 backdrop-blur-md text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background Soft Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/60 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-100/40 dark:bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Logo Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
            <Clock className="w-10 h-10 stroke-[2.2]" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white p-1 rounded-full shadow-md border-2 border-white dark:border-slate-900">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Headlines */}
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400 mb-1">
          WorkFlow Attendance System
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">
          Syncing Workspace
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 max-w-xs font-medium leading-relaxed">
          Initializing real-time team attendance terminal and database connections...
        </p>

        {/* Loading Progress Bar */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700 mb-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-75 ease-out shadow-xs"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>System Ready ({progress}%)</span>
        </div>
      </div>
    </div>
  );
});
