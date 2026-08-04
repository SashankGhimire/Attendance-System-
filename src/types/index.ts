export interface Employee {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  shift_start: string; // e.g. "09:00"
  shift_end: string;   // e.g. "17:00"
}

export type AttendanceStatus = 'Present' | 'Late' | 'Working' | 'Completed' | 'Absent';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;            // YYYY-MM-DD
  clock_in: string;        // ISO string or HH:mm:ss
  clock_out?: string | null; // ISO string or HH:mm:ss
  hours_worked?: string | null;
  status: AttendanceStatus;
  reason?: string | null;    // Reason for early/late clock-in or clock-out
  created_at?: string;
}

export interface AdminUser {
  username: string;
  authenticated: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type DateFilterType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all';
