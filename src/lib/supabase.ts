import { createClient } from '@supabase/supabase-js';
import { AttendanceRecord, Employee } from '../types';
import {
  composeAttendanceReasons,
  DEFAULT_EMPLOYEES,
  findMostRecentOpenAttendanceRecord,
  getTodayString,
  getYesterdayString,
  parseAttendanceReasons,
} from './utils';

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

const LOCAL_STORAGE_RECORDS_KEY = 'workflow_attendance_records';
const LOCAL_STORAGE_EMPLOYEES_KEY = 'workflow_team_employees';

let employeeSnapshot: Employee[] | null = null;
let attendanceSnapshot: AttendanceRecord[] | null = null;
let localEmployeeSnapshot: Employee[] | null = null;
let localAttendanceSnapshot: AttendanceRecord[] | null = null;
let localEmployeeSerialized = '';
let localAttendanceSerialized = '';
let pendingEmployeeFetch: Promise<Employee[]> | null = null;
let pendingAttendanceFetch: Promise<AttendanceRecord[]> | null = null;

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
    const [{ error: employeeError }, { error: attendanceError }] = await Promise.all([
      supabase.from('employees').select('id').limit(1),
      supabase.from('attendance').select('id').limit(1),
    ]);

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

function sortEmployeesByName(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => a.name.localeCompare(b.name));
}

function sortAttendanceByClockIn(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.clock_in).getTime();
    const bTime = new Date(b.clock_in).getTime();
    return bTime - aTime;
  });
}

function setEmployeeSnapshot(employees: Employee[]) {
  employeeSnapshot = sortEmployeesByName(employees);
}

function setAttendanceSnapshot(records: AttendanceRecord[]) {
  attendanceSnapshot = sortAttendanceByClockIn(records);
}

function getEmployeeSnapshot(): Employee[] | null {
  return employeeSnapshot;
}

function getAttendanceSnapshot(): AttendanceRecord[] | null {
  return attendanceSnapshot;
}

function syncLocalEmployeeSnapshot(employees: Employee[]) {
  const nextSerialized = JSON.stringify(employees);
  if (nextSerialized === localEmployeeSerialized) {
    return;
  }

  localEmployeeSnapshot = employees;
  localEmployeeSerialized = nextSerialized;
  localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, nextSerialized);
  window.dispatchEvent(new CustomEvent('workflow_employees_updated', { detail: employees }));
}

function syncLocalAttendanceSnapshot(records: AttendanceRecord[]) {
  const nextSerialized = JSON.stringify(records);
  if (nextSerialized === localAttendanceSerialized) {
    return;
  }

  localAttendanceSnapshot = records;
  localAttendanceSerialized = nextSerialized;
  localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, nextSerialized);
  window.dispatchEvent(new CustomEvent('workflow_attendance_updated', { detail: records }));
}

function updateAttendanceSnapshot(nextRecords: AttendanceRecord[]) {
  setAttendanceSnapshot(nextRecords);
  if (!canUseSupabase()) {
    syncLocalAttendanceSnapshot(attendanceSnapshot ?? []);
  }
}

function updateEmployeeSnapshot(nextEmployees: Employee[]) {
  setEmployeeSnapshot(nextEmployees);
  if (!canUseSupabase()) {
    syncLocalEmployeeSnapshot(employeeSnapshot ?? []);
  }
}

function updateAttendanceRecordInSnapshot(record: AttendanceRecord) {
  const current = getAttendanceSnapshot() ?? [];
  const nextRecords = current.map(item => (item.id === record.id ? record : item));
  updateAttendanceSnapshot(nextRecords);
}

function removeAttendanceRecordFromSnapshot(recordId: string) {
  const current = getAttendanceSnapshot() ?? [];
  updateAttendanceSnapshot(current.filter(item => item.id !== recordId));
}

function removeEmployeeFromSnapshot(employeeId: string) {
  const current = getEmployeeSnapshot() ?? [];
  updateEmployeeSnapshot(current.filter(item => item.id !== employeeId));
}

function upsertAttendanceRecordsInSnapshot(records: AttendanceRecord[]) {
  const current = getAttendanceSnapshot() ?? [];
  const byId = new Map(records.map(record => [record.id, record] as const));
  const nextRecords = current.map(item => byId.get(item.id) ?? item);
  for (const record of records) {
    if (!current.some(item => item.id === record.id)) {
      nextRecords.push(record);
    }
  }
  updateAttendanceSnapshot(nextRecords);
}

function upsertEmployeeInSnapshot(employee: Employee) {
  const current = getEmployeeSnapshot() ?? [];
  const nextEmployees = current.some(item => item.id === employee.id)
    ? current.map(item => (item.id === employee.id ? employee : item))
    : [...current, employee];
  updateEmployeeSnapshot(nextEmployees);
}

function deleteAttendanceRecordFromSnapshot(recordId: string) {
  removeAttendanceRecordFromSnapshot(recordId);
}

function deleteEmployeeFromSnapshot(employeeId: string) {
  removeEmployeeFromSnapshot(employeeId);
}

function mergeRealtimeAttendancePayload(payload: any): AttendanceRecord[] | null {
  const current = getAttendanceSnapshot();

  if (payload?.eventType === 'DELETE') {
    const deletedId = payload?.old?.id;
    if (!deletedId) return null;
    const nextRecords = (current ?? []).filter(record => record.id !== deletedId);
    setAttendanceSnapshot(nextRecords);
    return getAttendanceSnapshot();
  }

  const changedRecord = (payload?.new ?? payload?.old) as AttendanceRecord | undefined;
  if (!changedRecord?.id) {
    return null;
  }

  const nextRecords = current ?? [];
  const index = nextRecords.findIndex(record => record.id === changedRecord.id);

  if (index === -1) {
    setAttendanceSnapshot([...nextRecords, changedRecord]);
  } else {
    const updated = [...nextRecords];
    updated[index] = changedRecord;
    setAttendanceSnapshot(updated);
  }

  return getAttendanceSnapshot();
}

function mergeRealtimeEmployeePayload(payload: any): Employee[] | null {
  const current = getEmployeeSnapshot();

  if (payload?.eventType === 'DELETE') {
    const deletedId = payload?.old?.id;
    if (!deletedId) return null;
    const nextEmployees = (current ?? []).filter(employee => employee.id !== deletedId);
    setEmployeeSnapshot(nextEmployees);
    return getEmployeeSnapshot();
  }

  const changedEmployee = (payload?.new ?? payload?.old) as Employee | undefined;
  if (!changedEmployee?.id) {
    return null;
  }

  const nextEmployees = current ?? [];
  const index = nextEmployees.findIndex(employee => employee.id === changedEmployee.id);

  if (index === -1) {
    setEmployeeSnapshot([...nextEmployees, changedEmployee]);
  } else {
    const updated = [...nextEmployees];
    updated[index] = changedEmployee;
    setEmployeeSnapshot(updated);
  }

  return getEmployeeSnapshot();
}

const pendingClockIns = new Map<string, Promise<AttendanceRecord>>();

function getLocalEmployees(): Employee[] {
  if (localEmployeeSnapshot) {
    return localEmployeeSnapshot;
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    if (!raw) {
      localEmployeeSnapshot = sortEmployeesByName(DEFAULT_EMPLOYEES);
      localEmployeeSerialized = JSON.stringify(localEmployeeSnapshot);
      localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, localEmployeeSerialized);
      return localEmployeeSnapshot;
    }
    const parsed = JSON.parse(raw) as Employee[];
    localEmployeeSnapshot = sortEmployeesByName(parsed.length > 0 ? parsed : DEFAULT_EMPLOYEES);
    localEmployeeSerialized = JSON.stringify(localEmployeeSnapshot);
    return localEmployeeSnapshot;
  } catch (e) {
    return DEFAULT_EMPLOYEES;
  }
}

/**
 * Get initial records from local storage or defaults
 */
function getLocalRecords(): AttendanceRecord[] {
  if (localAttendanceSnapshot) {
    return localAttendanceSnapshot;
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as AttendanceRecord[];
    localAttendanceSnapshot = sortAttendanceByClockIn(parsed);
    localAttendanceSerialized = JSON.stringify(localAttendanceSnapshot);
    return localAttendanceSnapshot;
  } catch (e) {
    return [];
  }
}

/**
 * Save records to local storage and dispatch custom event
 */
function saveLocalRecords(records: AttendanceRecord[]) {
  try {
    const sortedRecords = sortAttendanceByClockIn(records);
    syncLocalAttendanceSnapshot(sortedRecords);
    setAttendanceSnapshot(sortedRecords);
  } catch (e) {
    console.error('Failed to save local attendance records', e);
  }
}

/**
 * Save employees to local storage and dispatch custom event for realtime UI sync everywhere
 */
function saveLocalEmployees(employees: Employee[]) {
  try {
    const sortedEmployees = sortEmployeesByName(employees);
    syncLocalEmployeeSnapshot(sortedEmployees);
    setEmployeeSnapshot(sortedEmployees);
  } catch (e) {
    console.error('Failed to save local employees', e);
  }
}

/**
 * Fetch all employees
 */
export async function fetchEmployees(options: { force?: boolean } = {}): Promise<Employee[]> {
  if (!options.force && employeeSnapshot) {
    return employeeSnapshot;
  }

  if (pendingEmployeeFetch) {
    return pendingEmployeeFetch;
  }

  const fetchPromise = (async () => {
    const client = supabase;
    if (canUseSupabase() && client) {
      try {
        const { data, error } = await client.from('employees').select('*').order('name');
        if (!error && data) {
          markSupabaseHealth(true);
          const nextEmployees = data as Employee[];
          setEmployeeSnapshot(nextEmployees);
          return employeeSnapshot ?? nextEmployees;
        }
      } catch (err) {
        markSupabaseHealth(false);
        console.warn('Supabase employees query error', err);
      }
    }

    const localEmployees = getLocalEmployees();
    setEmployeeSnapshot(localEmployees);
    return employeeSnapshot ?? localEmployees;
  })();

  pendingEmployeeFetch = fetchPromise;
  try {
    return await fetchPromise;
  } finally {
    if (pendingEmployeeFetch === fetchPromise) {
      pendingEmployeeFetch = null;
    }
  }
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
        const insertedEmployee = data as Employee;
        upsertEmployeeInSnapshot(insertedEmployee);
        return insertedEmployee;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase add employee error', err);
    }
  }

  const currentLocal = getLocalEmployees();
  const updated = [...currentLocal, newEmp];
  saveLocalEmployees(updated);
  upsertEmployeeInSnapshot(newEmp);
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
        const updatedEmployee = data as Employee;
        upsertEmployeeInSnapshot(updatedEmployee);
        return updatedEmployee;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase update employee error', err);
    }
  }

  const currentLocal = getLocalEmployees();
  const updated = currentLocal.map(e => (e.id === emp.id ? emp : e));
  saveLocalEmployees(updated);
  upsertEmployeeInSnapshot(emp);
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
      deleteEmployeeFromSnapshot(empId);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase delete employee error:', e);
    }
  }

  const currentLocal = getLocalEmployees();
  const filtered = currentLocal.filter(e => e.id !== empId);
  saveLocalEmployees(filtered);
  deleteEmployeeFromSnapshot(empId);
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
      setAttendanceSnapshot([]);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase clear records error', e);
    }
  }
  saveLocalRecords([]);
  setAttendanceSnapshot([]);
  return true;
}

/**
 * Fetch all attendance records
 */
export async function fetchAttendance(options: { force?: boolean } = {}): Promise<AttendanceRecord[]> {
  if (!options.force && attendanceSnapshot) {
    return attendanceSnapshot;
  }

  if (pendingAttendanceFetch) {
    return pendingAttendanceFetch;
  }

  const fetchPromise = (async () => {
    const client = supabase;
    if (canUseSupabase() && client) {
      try {
        const { data, error } = await client
          .from('attendance')
          .select('*')
          .order('clock_in', { ascending: false });

        if (!error && data) {
          markSupabaseHealth(true);
          const nextRecords = data as AttendanceRecord[];
          setAttendanceSnapshot(nextRecords);
          return attendanceSnapshot ?? nextRecords;
        }
      } catch (err) {
        markSupabaseHealth(false);
        console.warn('Supabase attendance query error', err);
      }
    }

    const localRecords = getLocalRecords();
    setAttendanceSnapshot(localRecords);
    return attendanceSnapshot ?? localRecords;
  })();

  pendingAttendanceFetch = fetchPromise;

  try {
    return await fetchPromise;
  } finally {
    if (pendingAttendanceFetch === fetchPromise) {
      pendingAttendanceFetch = null;
    }
  }
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
          const insertedRecord = data as AttendanceRecord;
          upsertAttendanceRecordsInSnapshot([insertedRecord]);
          return insertedRecord;
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
    upsertAttendanceRecordsInSnapshot([newRecord]);
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
  const currentRecords = await fetchAttendance();
  const targetRecord = currentRecords.find(r => r.id === recordId);
  if (!targetRecord) {
    return null;
  }

  const openRecordsForEmployee = currentRecords.filter(
    r => r.employee_id === targetRecord.employee_id && !r.clock_out
  );

  if (openRecordsForEmployee.length === 0) {
    return targetRecord;
  }

  const client = supabase;
  if (canUseSupabase() && client) {
    try {
      const updates = await Promise.all(
        openRecordsForEmployee.map(async openRecord => {
          const { clockInReason } = parseAttendanceReasons(openRecord.reason);
          const combinedReason = composeAttendanceReasons(clockInReason, reason);

          const { data, error } = await client
            .from('attendance')
            .update({
              clock_out: clockOutTime,
              hours_worked: hoursWorked,
              reason: combinedReason,
            })
            .eq('id', openRecord.id)
            .select()
            .single();

          if (error || !data) {
            throw error || new Error('Clock-out update failed');
          }

          return data as AttendanceRecord;
        })
      );

      if (updates.length > 0) {
        markSupabaseHealth(true);
        upsertAttendanceRecordsInSnapshot(updates);
        return updates.find(record => record.id === recordId) ?? updates[0] ?? null;
      }
    } catch (err) {
      markSupabaseHealth(false);
      console.warn('Supabase clock-out error', err);
    }
  }

  const localRecords = getLocalRecords();
  let updatedRecord: AttendanceRecord | null = null;

  const updatedRecords = localRecords.map(r => {
    if (r.employee_id === targetRecord.employee_id && !r.clock_out) {
      const { clockInReason } = parseAttendanceReasons(r.reason);
      const combinedReason = composeAttendanceReasons(clockInReason, reason);

      const nextRecord = {
        ...r,
        clock_out: clockOutTime,
        hours_worked: hoursWorked,
        reason: combinedReason,
      };

      if (r.id === recordId) {
        updatedRecord = nextRecord;
      }

      return nextRecord;
    }
    return r;
  });

  if (!updatedRecord) {
    updatedRecord = updatedRecords.find(r => r.id === recordId) ?? null;
  }

  if (updatedRecord) {
    saveLocalRecords(updatedRecords);
    upsertAttendanceRecordsInSnapshot([updatedRecord]);
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
        const reclockedRecord = data as AttendanceRecord;
        upsertAttendanceRecordsInSnapshot([reclockedRecord]);
        return reclockedRecord;
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
    upsertAttendanceRecordsInSnapshot([updatedRecord]);
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
      deleteAttendanceRecordFromSnapshot(recordId);
      return true;
    } catch (e) {
      markSupabaseHealth(false);
      console.error('Supabase delete attendance error:', e);
    }
  }

  const currentRecords = getLocalRecords();
  const filtered = currentRecords.filter(r => r.id !== recordId);
  saveLocalRecords(filtered);
  deleteAttendanceRecordFromSnapshot(recordId);
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
        const updatedAttendance = data as AttendanceRecord;
        updateAttendanceRecordInSnapshot(updatedAttendance);
        return updatedAttendance;
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
    updateAttendanceRecordInSnapshot(updatedRecord);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async payload => {
        const updated = mergeRealtimeAttendancePayload(payload);
        if (updated) {
          onChange(updated);
          return;
        }

        onChange(await fetchAttendance({ force: true }));
      })
      .subscribe();
  }

  if (!canUseSupabase()) {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async payload => {
        const updated = mergeRealtimeEmployeePayload(payload);
        if (updated) {
          onChange(updated);
          return;
        }

        onChange(await fetchEmployees({ force: true }));
      })
      .subscribe();
  }

  if (!canUseSupabase()) {
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
