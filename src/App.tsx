import React, { useState, useEffect, useCallback } from 'react';
import { Employee, AttendanceRecord, AdminUser, ToastMessage } from './types';
import {
  fetchEmployees,
  fetchAttendance,
  subscribeToRealtimeAttendance,
  subscribeToRealtimeEmployees,
} from './lib/supabase';
import { SplashScreen } from './components/SplashScreen';
import { Navbar } from './components/Navbar';
import { EmployeeCard } from './components/EmployeeCard';
import { DashboardCards } from './components/DashboardCards';
import { AttendanceTable } from './components/AttendanceTable';
import { AdminLoginModal } from './components/AdminLoginModal';
import { TeamManagerModal } from './components/TeamManagerModal';
import { AdminResetSidePanel } from './components/AdminResetSidePanel';
import { ToastContainer } from './components/Toast';
import { Shield, Lock } from 'lucide-react';
import { DataSourceState, isSupabaseConfigured, probeDataSource } from './lib/supabase';
import { getTodayString } from './lib/utils';

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Live System Time State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Dark Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('workflow_dark_mode');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  // Apply dark mode class on <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('workflow_dark_mode', JSON.stringify(isDarkMode));
    } catch (e) {
      // ignore
    }
  }, [isDarkMode]);

  // Admin Authentication State
  const [admin, setAdmin] = useState<AdminUser>({
    username: 'Admin',
    authenticated: false,
  });

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');

  // Modals and Side Panel States
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTeamManagerOpen, setIsTeamManagerOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Database Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dataSourceState, setDataSourceState] = useState<DataSourceState>({
    mode: 'checking',
    label: 'Checking data source...',
    description: 'Verifying whether Supabase is available.',
  });

  // Toast Helper
  const addToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      setToasts(prev => [...prev, { id, type, title, description }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleTabChange = useCallback((tab: 'employee' | 'admin') => {
    setActiveTab(tab);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const handleOpenAdminModal = useCallback(() => {
    setIsAdminModalOpen(true);
  }, []);

  const handleCloseAdminModal = useCallback(() => {
    setIsAdminModalOpen(false);
  }, []);

  const handleOpenSidePanel = useCallback(() => {
    setIsSidePanelOpen(true);
  }, []);

  const handleCloseSidePanel = useCallback(() => {
    setIsSidePanelOpen(false);
  }, []);

  const handleOpenTeamManager = useCallback(() => {
    setIsTeamManagerOpen(true);
  }, []);

  const handleCloseTeamManager = useCallback(() => {
    setIsTeamManagerOpen(false);
  }, []);

  const handleReplaySplash = useCallback(() => {
    setShowSplash(true);
  }, []);

  const handleAdminLoginError = useCallback((title: string, desc?: string) => {
    addToast('error', title, desc);
  }, [addToast]);

  // Update Live Clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial employees and attendance records
  const loadData = useCallback(async () => {
    const [fetchedEmps, fetchedRecs] = await Promise.all([
      fetchEmployees(),
      fetchAttendance(),
    ]);
    setEmployees(fetchedEmps);
    setRecords(fetchedRecs);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeAttendance = () => {};
    let unsubscribeEmployees = () => {};

    const initializeData = async () => {
      const state = await probeDataSource();

      if (!isMounted) {
        return;
      }

      setDataSourceState(state);

      const [fetchedEmps, fetchedRecs] = await Promise.all([
        fetchEmployees(),
        fetchAttendance(),
      ]);

      if (!isMounted) {
        return;
      }

      setEmployees(fetchedEmps);
      setRecords(fetchedRecs);

      unsubscribeAttendance = subscribeToRealtimeAttendance(updatedRecords => {
        if (isMounted) setRecords(updatedRecords);
      });
      unsubscribeEmployees = subscribeToRealtimeEmployees(updatedEmployees => {
        if (isMounted) setEmployees(updatedEmployees);
      });
    };

    void initializeData();

    return () => {
      isMounted = false;
      unsubscribeAttendance();
      unsubscribeEmployees();
    };
  }, [loadData]);

  const handleCompleteSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleAdminLoginSuccess = useCallback(() => {
    setAdmin({ username: 'Admin', authenticated: true });
    setActiveTab('admin');
    addToast('success', 'Logged in as Admin', 'Welcome to the Admin Dashboard');
  }, [addToast]);

  const handleAdminLogout = useCallback(() => {
    setAdmin({ username: 'Admin', authenticated: false });
    setActiveTab('employee');
    setIsTeamManagerOpen(false);
    setIsSidePanelOpen(false);
    addToast('info', 'Logged Out', 'You have been logged out of Admin mode');
  }, [addToast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col transition-colors duration-200">
      {/* 1. Splash Screen Overlay */}
      {showSplash && (
        <SplashScreen
          onComplete={handleCompleteSplash}
          duration={1800}
        />
      )}

      {/* 2. Top Navigation Bar */}
      <Navbar
        currentTime={currentTime}
        admin={admin}
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        onTabChange={handleTabChange}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenAdminModal={handleOpenAdminModal}
        onAdminLogout={handleAdminLogout}
        onOpenSidePanel={handleOpenSidePanel}
        onOpenTeamManager={handleOpenTeamManager}
        onReplaySplash={handleReplaySplash}
      />

      {/* 3. Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {activeTab === 'employee' ? (
          /* Employee Clock Station View */
          <EmployeeCard
            employees={employees}
            attendanceRecords={records}
            currentTime={currentTime}
            onRecordChange={loadData}
            onShowToast={addToast}
          />
        ) : (
          /* Admin Dashboard View */
          admin.authenticated ? (
            <div className="space-y-8 animate-fade-in">
              <DashboardCards
                records={records}
                employees={employees}
                currentTime={currentTime}
              />
              <AttendanceTable
                records={records}
                currentDateKey={getTodayString(currentTime)}
                onRecordDeleted={loadData}
                onOpenTeamManager={handleOpenTeamManager}
                onShowToast={addToast}
                dataSourceState={dataSourceState}
              />
            </div>
          ) : (
            /* Admin Protection Prompt */
            <div className="max-w-md mx-auto py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Admin Authorization Required</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
                Please log in with administrator credentials to view real-time statistics, edit team rosters, and manage attendance records.
              </p>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Open Admin Login</span>
              </button>
            </div>
          )
        )}
      </main>

      {/* Bottom Status Bar Footer */}
      <footer className="h-10 bg-slate-900 dark:bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 sm:px-8 text-slate-400 shrink-0 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-200">System Live</span>
          </div>
          <span className="opacity-20">|</span>
          <span className="hidden sm:inline">Realtime Database Sync</span>
        </div>
        <span className="font-medium opacity-60 normal-case text-slate-300">
          WorkFlow Attendance © {currentTime.getFullYear()}
        </span>
      </footer>

      {/* 4. Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={handleCloseAdminModal}
        onLoginSuccess={handleAdminLoginSuccess}
        onErrorToast={handleAdminLoginError}
      />

      {/* 5. Team Manager Modal */}
      <TeamManagerModal
        isOpen={isTeamManagerOpen}
        onClose={handleCloseTeamManager}
        employees={employees}
        onEmployeesChange={loadData}
        onShowToast={addToast}
      />

      {/* 6. Admin Reset Side Panel */}
      <AdminResetSidePanel
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
        records={records}
        employees={employees}
        onDataReset={loadData}
        onOpenTeamManager={handleOpenTeamManager}
        onShowToast={addToast}
      />

      {/* 7. Notification Toast Manager */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
