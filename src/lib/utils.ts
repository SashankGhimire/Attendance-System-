import { AttendanceRecord } from '../types';

/**
 * Default preset employees
 */
export const DEFAULT_EMPLOYEES = [
  { id: 'emp-1', name: 'Sabin', shift_start: '12:00', shift_end: '20:00' },
  { id: 'emp-2', name: 'Charlie', shift_start: '09:00', shift_end: '17:00' },
  { id: 'emp-3', name: 'Ujjwal', shift_start: '22:00', shift_end: '05:00' },
  { id: 'emp-4', name: 'Leo', shift_start: '05:00', shift_end: '13:00' },
];

/**
 * Formats YYYY-MM-DD or ISO string into "Aug 31, 2026" format
 */
export function formatTableDate(dateStr: string): string {
  if (!dateStr) return '';
  let dateObj: Date;
  if (dateStr.includes('T')) {
    dateObj = new Date(dateStr);
  } else {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      dateObj = new Date(dateStr);
    }
  }
  if (isNaN(dateObj.getTime())) return dateStr;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[dateObj.getMonth()];
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  return `${month} ${dayStr}, ${year}`;
}

/**
 * Formats a Date object into a clean date string e.g. "Tuesday, August 4, 2026"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Formats time string or Date into 12-hour format e.g. "09:30:15 AM"
 */
export function formatTime(input: Date | string | null | undefined, includeSeconds = true): string {
  if (!input) return '--:--';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(date.getTime())) {
    // If it's already a formatted string like "09:00 AM", return it
    return input.toString();
  }
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  });
}

/**
 * Formats 24h string "09:00" to "9:00 AM"
 */
export function formatShiftTime(timeHHMM: string): string {
  if (!timeHHMM) return '';
  const [h, m] = timeHHMM.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 === 0 ? 12 : h % 12;
  return `${formattedH}:${m < 10 ? '0' : ''}${m} ${period}`;
}

/**
 * Returns date formatted as YYYY-MM-DD
 */
export function getTodayString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday date formatted as YYYY-MM-DD
 */
export function getYesterdayString(d: Date = new Date()): string {
  const date = new Date(d);
  date.setDate(date.getDate() - 1);
  return getTodayString(date);
}

/**
 * Finds the most recent open attendance record for a specific employee.
 */
export function findMostRecentOpenAttendanceRecord(records: AttendanceRecord[], employeeId: string): AttendanceRecord | null {
  let latestOpenRecord: AttendanceRecord | null = null;

  for (const record of records) {
    if (record.employee_id !== employeeId || record.clock_out) {
      continue;
    }

    if (!latestOpenRecord) {
      latestOpenRecord = record;
      continue;
    }

    const recordTime = new Date(record.clock_in).getTime();
    const latestTime = new Date(latestOpenRecord.clock_in).getTime();

    if (!isNaN(recordTime) && (isNaN(latestTime) || recordTime > latestTime)) {
      latestOpenRecord = record;
    }
  }

  return latestOpenRecord;
}

/**
 * Returns whether a record should appear in the default "today" admin view.
 * This keeps overnight open shifts visible before and after they clock out.
 */
export function isAttendanceRelevantForToday(record: AttendanceRecord, currentDate: Date = new Date()): boolean {
  const todayStr = getTodayString(currentDate);
  const yesterdayStr = getYesterdayString(currentDate);

  if (record.date === todayStr) {
    return true;
  }

  if (!record.clock_out && record.date === yesterdayStr) {
    return true;
  }

  if (record.clock_out && getTodayString(new Date(record.clock_out)) === todayStr) {
    return true;
  }

  return false;
}

/**
 * Calculates hours worked between clock-in and clock-out ISO times,
 * correctly supporting overnight shifts!
 */
export function calculateHoursWorked(clockInISO: string, clockOutISO: string): string {
  const inTime = new Date(clockInISO).getTime();
  const outTime = new Date(clockOutISO).getTime();

  if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) {
    return '0.0 hrs';
  }

  const diffMs = outTime - inTime;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}.0 hrs`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Automatically determines if an employee is 'Present' or 'Late'
 * based on their clock-in time and expected shift start time (e.g. "09:00").
 * Gives a 15-minute grace window.
 */
export function determineClockInStatus(clockInDate: Date, shiftStartHHMM: string): 'Present' | 'Late' {
  const timing = checkClockInTiming(clockInDate, shiftStartHHMM);
  return timing === 'late' ? 'Late' : 'Present';
}

/**
 * Checks if clock-in is early, late, or normal (on-time)
 */
export function checkClockInTiming(clockInDate: Date, shiftStartHHMM: string): 'early' | 'late' | 'normal' {
  if (!shiftStartHHMM) return 'normal';
  const [shiftHour, shiftMinute] = shiftStartHHMM.split(':').map(Number);
  const targetTime = new Date(clockInDate);
  targetTime.setHours(shiftHour, shiftMinute, 0, 0);

  const diffMinutes = (clockInDate.getTime() - targetTime.getTime()) / (1000 * 60);
  if (diffMinutes < 0) {
    return 'early';
  } else if (diffMinutes > 15) {
    return 'late';
  }
  return 'normal';
}

/**
 * Checks if clock-out is early, late (overtime), or normal
 */
export function checkClockOutTiming(clockOutDate: Date, shiftEndHHMM: string): 'early' | 'late' | 'normal' {
  if (!shiftEndHHMM) return 'normal';
  const [shiftHour, shiftMinute] = shiftEndHHMM.split(':').map(Number);
  const targetTime = new Date(clockOutDate);
  targetTime.setHours(shiftHour, shiftMinute, 0, 0);

  const diffMinutes = (clockOutDate.getTime() - targetTime.getTime()) / (1000 * 60);
  if (diffMinutes < -5) {
    return 'early';
  } else if (diffMinutes > 5) {
    return 'late';
  }
  return 'normal';
}

/**
 * Checks whether current time has passed the scheduled shift end time for an employee
 */
export function hasShiftTimePassed(currentTime: Date, shiftStartHHMM: string, shiftEndHHMM: string): boolean {
  if (!shiftEndHHMM) return false;
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [startH, startM] = (shiftStartHHMM || '09:00').split(':').map(Number);
  const [endH, endM] = shiftEndHHMM.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    // Standard daytime shift (e.g., 09:00 - 17:00)
    return currentMinutes >= endMinutes;
  } else {
    // Overnight shift (e.g., 22:00 - 05:00)
    return currentMinutes >= endMinutes && currentMinutes < startMinutes;
  }
}

/**
 * Export attendance records to CSV file
 */
export function exportToCSV(records: AttendanceRecord[], filename = 'attendance_report.csv') {
  const headers = ['Employee Name', 'Date', 'Clock In', 'Clock Out', 'Hours Worked', 'Status', 'Reason'];
  const rows = records.map(r => [
    `"${r.employee_name}"`,
    `"${r.date}"`,
    `"${formatTime(r.clock_in, false)}"`,
    `"${r.clock_out ? formatTime(r.clock_out, false) : '-'}"`,
    `"${r.hours_worked || 'In Progress'}"`,
    `"${r.status}"`,
    `"${r.reason || '-'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export attendance records to Excel XML/HTML Spreadsheet format
 */
export function exportToExcel(records: AttendanceRecord[], filename = 'attendance_report.xls') {
  let table = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Attendance</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      th { background-color: #2563EB; color: white; font-weight: bold; font-family: Arial; }
      td { font-family: Arial; font-size: 13px; }
    </style>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Date</th>
          <th>Clock In</th>
          <th>Clock Out</th>
          <th>Hours Worked</th>
          <th>Status</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>`;

  records.forEach(r => {
    table += `
      <tr>
        <td>${r.employee_name}</td>
        <td>${r.date}</td>
        <td>${formatTime(r.clock_in, false)}</td>
        <td>${r.clock_out ? formatTime(r.clock_out, false) : '-'}</td>
        <td>${r.hours_worked || 'In Progress'}</td>
        <td>${r.status}</td>
        <td>${r.reason || '-'}</td>
      </tr>`;
  });

  table += `
      </tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
