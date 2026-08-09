import { createClient } from '@supabase/supabase-js';
import { AttendanceRecord, Employee } from '../types';
import { DEFAULT_EMPLOYEES, findMostRecentOpenAttendanceRecord, getTodayString, getYesterdayString } from './utils';

function normalizeSupabaseProjectUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed
      .replace(/\/+$/, '')
      .replace(/\/rest\/v1$/i, '');
  }
}

function isSupportedSupabaseHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.supabase.co') ||
    hostname.endsWith('.supabase.in')
  );
}

const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  '';

const supabaseUrl = normalizeSupabaseProjectUrl(rawSupabaseUrl);

const supabaseAnonKey = 
  (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) ||
  '').trim();

// Helper to determine if actual Supabase keys are provided
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const parsed = new URL(supabaseUrl);
    return (
      !supabaseUrl.includes('your-project') &&
      !supabaseUrl.includes('YOUR_SUPABASE') &&
      isSupportedSupabaseHost(parsed.hostname)
    );
  } catch {
    return false;
  }
};

let supabaseHealth: 'unknown' | 'available' | 'unavailable' = 'unknown';

function markSupabaseHealth(available: boolean) {
  supabaseHealth = available ? 'available' : 'unavailable';
}

function canUseSupabase(): boolean {
  return (
    isSupabaseConfigured() &&
    !!supabase &&
    supabaseHealth !== 'unavailable'
  );
}

// Initialize Supabase client if configured
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type DataSourceState = {
  mode: 'checking' | 'supabase' | 'local-storage' | 'local-fallback';
  label: string;
  description: string;
};

export async function probeDataSource(): Promise<DataSourceState> {
  if (!isSupabaseConfigured() || !supabase) {
    markSupabaseHealth(false);
    return {
      mode: 'local-storage',
      label: 'Local Storage Mode',
      description: 'Supabase is not configured, so the app is using local storage.',
    };
  }

  try {
    const { error: employeeError } = await supabase.from('employees').select('id').limit(1);
    const { error: attendanceError } = await supabase.from('attendance').select('id').limit(1);
    if (!employeeError && !attendanceError) {
      markSupabaseHealth(true);
      return {
        mode: 'supabase',
        label: 'Supabase Connected',
        description: 'Live backend sync is active.',
      };
    }
  } catch (err) {
    markSupabaseHealth(false);
    console.warn('Supabase connection probe failed, using local fallback', err);
  }

  markSupabaseHealth(false);
  return {
    mode: 'local-fallback',
    label: 'Supabase Check Failed',
    description: 'Supabase credentials were found, but the app could not confirm the backend connection.',
  };
}

const LOCAL_STORAGE_RECORDS_KEY = 'workflow_attendance_records';
const LOCAL_STORAGE_EMPLOYEES_KEY = 'workflow_team_employees';
const pendingClockIns = new Map<string, Promise<AttendanceRecord>>();

function getLocalEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, JSON.stringify(DEFAULT_EMPLOYEES));
      return DEFAULT_EMPLOYEES;
    }
    const parsed = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_EMPLOYEES;
  } catch (e) {
    return DEFAULT_EMPLOYEES;
  }
}

/**
 * Get initial records from local storage or defaults
 */
function getLocalRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Save records to local storage and dispatch custom event
 */
function saveLocalRecords(records: AttendanceRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('workflow_attendance_updated', { detail: records }));
  } catch (e) {
    console.error('Failed to save local attendance records', e);
  }
}

/**
 * Save employees to local storage and dispatch custom event for realtime UI sync everywhere
 */
function saveLocalEmployees(employees: Employee[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, JSON.stringify(employees));
    window.dispatchEvent(new CustomEvent('workflow_employees_updated', { detail: employees }));
  } catch (e) {
    console.error('Failed to save local employees', e);
  }
}

/**
 * Fetch all employees
 */
export async function fetchEmployees(): Promise<Employee[]> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client.from('employees').select('*').order('name');
      if (!error && data) {
        markSupabaseHealth(true);
        return data as Employee[];
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase employees query error', err);
    }
  }
  return getLocalEmployees();
}

/**
 * Add a new team member
 */
export async function addEmployee(emp: Omit<Employee, 'id'>): Promise<Employee> {
  const newEmp: Employee = {
    ...emp,
    id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
  };

  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client.from('employees').insert(emp).select().single();
      if (!error && data) {
        markSupabaseHealth(true);
        return data as Employee;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase add employee error', err);
    }
  }

  const currentLocal = getLocalEmployees();
  const updated = [...currentLocal, newEmp];
  saveLocalEmployees(updated);
  return newEmp;
}

/**
 * Update an existing team member (allows admin to update shift times live)
 */
export async function updateEmployee(emp: Employee): Promise<Employee> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client
        .from('employees')
        .update({
          name: emp.name,
          shift_start: emp.shift_start,
          shift_end: emp.shift_end,
        })
        .eq('id', emp.id)
        .select()
        .single();

      if (!error && data) {
        markSupabaseHealth(true);
        return data as Employee;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase update employee error', err);
    }
  }

  const currentLocal = getLocalEmployees();
  const updated = currentLocal.map(e => (e.id === emp.id ? emp : e));
  saveLocalEmployees(updated);
  return emp;
}

/**
 * Delete a team member
 */
export async function deleteEmployee(empId: string): Promise<boolean> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { error } = await client.from('employees').delete().eq('id', empId);
      if (error) throw error;
      markSupabaseHealth(true);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase delete employee error:', e);
    }
  }

  const currentLocal = getLocalEmployees();
  const filtered = currentLocal.filter(e => e.id !== empId);
  saveLocalEmployees(filtered);
  return true;
}

/**
 * Clear all attendance records
 */
export async function clearAllAttendanceRecords(): Promise<boolean> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { error } = await client.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      markSupabaseHealth(true);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase clear records error', e);
    }
  }
  saveLocalRecords([]);
  return true;
}

/**
 * Fetch all attendance records
 */
export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client
        .from('attendance')
        .select('*')
        .order('clock_in', { ascending: false });

      if (!error && data) {
        markSupabaseHealth(true);
        return data as AttendanceRecord[];
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase attendance query error', err);
    }
  }
  return getLocalRecords();
}

/**
 * Record Clock In
 */
export async function recordClockIn(
  employee: Employee,
  status: 'Present' | 'Late',
  reason?: string
): Promise<AttendanceRecord> {
  const existingPending = pendingClockIns.get(employee.id);
  if (existingPending) {
    return existingPending;
  }

  const clockInOperation = (async () => {
    const clockInTime = new Date().toISOString();
    const todayStr = getTodayString();

    const currentRecords = await fetchAttendance();
    const existingOpenRecord = findMostRecentOpenAttendanceRecord(currentRecords, employee.id);
    if (existingOpenRecord) {
      return existingOpenRecord;
    }

    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employee_id: employee.id,
      employee_name: employee.name,
      date: todayStr,
      clock_in: clockInTime,
      clock_out: null,
      hours_worked: null,
      status: status,
      reason: reason || null,
      created_at: clockInTime,
    };

    const client = supabase;
    if (canUseSupabase() && client) {
      try {
        const { data, error } = await client
          .from('attendance')
          .insert({
            employee_id: employee.id,
            employee_name: employee.name,
            date: todayStr,
            clock_in: clockInTime,
            status: status,
            reason: reason || null,
          })
          .select()
          .single();

        if (!error && data) {
          markSupabaseHealth(true);
          return data as AttendanceRecord;
        }
      } catch (err) {
        markSupabaseHealth(false);
        console.warn('Supabase clock-in error', err);
      }
    }

    const localRecords = getLocalRecords();
    const existingLocalOpenRecord = findMostRecentOpenAttendanceRecord(localRecords, employee.id);
    if (existingLocalOpenRecord) {
      return existingLocalOpenRecord;
    }

    const updatedRecords = [newRecord, ...localRecords];
    saveLocalRecords(updatedRecords);
    return newRecord;
  })();

  pendingClockIns.set(employee.id, clockInOperation);

  try {
    return await clockInOperation;
  } finally {
    pendingClockIns.delete(employee.id);
  }
}

/**
 * Record Clock Out
 */
export async function recordClockOut(
  recordId: string,
  clockOutTime: string,
  hoursWorked: string,
  reason?: string
): Promise<AttendanceRecord | null> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const existing = (await fetchAttendance()).find(r => r.id === recordId);
      const combinedReason = existing?.reason
        ? (reason ? `${existing.reason} | Out Note: ${reason}` : existing.reason)
        : (reason ? `Out Note: ${reason}` : null);

      const { data, error } = await client
        .from('attendance')
        .update({
          clock_out: clockOutTime,
          hours_worked: hoursWorked,
          reason: combinedReason,
        })
        .eq('id', recordId)
        .select()
        .single();

      if (!error && data) {
        markSupabaseHealth(true);
        return data as AttendanceRecord;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase clock-out error', err);
    }
  }

  const currentRecords = getLocalRecords();
  let updatedRecord: AttendanceRecord | null = null;

  const updatedRecords = currentRecords.map(r => {
    if (r.id === recordId) {
      const combinedReason = r.reason
        ? (reason ? `${r.reason} | Out Note: ${reason}` : r.reason)
        : (reason ? `Out Note: ${reason}` : null);

      updatedRecord = {
        ...r,
        clock_out: clockOutTime,
        hours_worked: hoursWorked,
        reason: combinedReason,
      };
      return updatedRecord;
    }
    return r;
  });

  if (updatedRecord) {
    saveLocalRecords(updatedRecords);
  }

  return updatedRecord;
}

/**
 * Reclock Record (Re-open shift by clearing clock out or updating clock in)
 */
export async function reclockRecord(
  recordId: string,
  reason?: string
): Promise<AttendanceRecord | null> {
  const clockInTime = new Date().toISOString();
  const reclockReason = reason ? `Re-clocked: ${reason}` : 'Re-clocked shift';

  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client
        .from('attendance')
        .update({
          clock_in: clockInTime,
          clock_out: null,
          hours_worked: null,
          reason: reclockReason,
        })
        .eq('id', recordId)
        .select()
        .single();

      if (!error && data) {
        markSupabaseHealth(true);
        return data as AttendanceRecord;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase reclock error', err);
    }
  }

  const currentRecords = getLocalRecords();
  let updatedRecord: AttendanceRecord | null = null;

  const updatedRecords = currentRecords.map(r => {
    if (r.id === recordId) {
      updatedRecord = {
        ...r,
        clock_in: clockInTime,
        clock_out: null,
        hours_worked: null,
        reason: reclockReason,
      };
      return updatedRecord;
    }
    return r;
  });

  if (updatedRecord) {
    saveLocalRecords(updatedRecords);
  }

  return updatedRecord;
}

/**
 * Delete Attendance Record
 */
export async function deleteAttendanceRecord(recordId: string): Promise<boolean> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { error } = await client.from('attendance').delete().eq('id', recordId);
      if (error) throw error;
      markSupabaseHealth(true);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase delete attendance error:', e);
    }
  }

  const currentRecords = getLocalRecords();
  const filtered = currentRecords.filter(r => r.id !== recordId);
  saveLocalRecords(filtered);
  return true;
}

/**
 * Update an Attendance Record
 */
export async function updateAttendanceRecord(
  recordId: string,
  updates: Partial<AttendanceRecord>
): Promise<AttendanceRecord | null> {
  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const { data, error } = await client
        .from('attendance')
        .update(updates)
        .eq('id', recordId)
        .select()
        .single();

      if (!error && data) {
        markSupabaseHealth(true);
        return data as AttendanceRecord;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase update attendance record error', err);
    }
  }

  const currentRecords = getLocalRecords();
  let updatedRecord: AttendanceRecord | null = null;

  const updatedRecords = currentRecords.map(r => {
    if (r.id === recordId) {
      updatedRecord = {
        ...r,
        ...updates,
      };
      return updatedRecord;
    }
    return r;
  });

  if (updatedRecord) {
    saveLocalRecords(updatedRecords);
  }

  return updatedRecord;
}

/**
 * Realtime Subscription for Attendance table
 */
export function subscribeToRealtimeAttendance(onChange: (records: AttendanceRecord[]) => void) {
  const client = supabase;
  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

  if (canUseSupabase() && client) {
    supabaseChannel = client
      .channel('public:attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async () => {
        const updated = await fetchAttendance();
        onChange(updated);
      })
      .subscribe();
  }

  if (!isSupabaseConfigured()) {
    const handleLocalUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<AttendanceRecord[]>;
      if (customEvt.detail) {
        onChange(customEvt.detail);
      }
    };
    window.addEventListener('workflow_attendance_updated', handleLocalUpdate);

    return () => {
      window.removeEventListener('workflow_attendance_updated', handleLocalUpdate);
    };
  }

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

/**
 * Realtime Subscription for Employees table / local storage
 */
export function subscribeToRealtimeEmployees(onChange: (employees: Employee[]) => void) {
  const client = supabase;
  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

  if (canUseSupabase() && client) {
    supabaseChannel = client
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
        const updated = await fetchEmployees();
        onChange(updated);
      })
      .subscribe();
  }

  if (!isSupabaseConfigured()) {
    const handleLocalUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<Employee[]>;
      if (customEvt.detail) {
        onChange(customEvt.detail);
      }
    };
    window.addEventListener('workflow_employees_updated', handleLocalUpdate);

    return () => {
      window.removeEventListener('workflow_employees_updated', handleLocalUpdate);
    };
  }

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
