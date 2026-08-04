-- ====================================================================
-- WORKFLOW ATTENDANCE & TEAM MANAGEMENT - COMPLETE DATABASE SCHEMA
-- ====================================================================

-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY DEFAULT ('emp-' || gen_random_uuid()),
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Team Member',
    avatar TEXT,
    shift_start VARCHAR(10) NOT NULL DEFAULT '09:00',
    shift_end VARCHAR(10) NOT NULL DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies for Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
CREATE POLICY "Allow public read access to employees" ON public.employees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to employees" ON public.employees;
CREATE POLICY "Allow public insert to employees" ON public.employees FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to employees" ON public.employees;
CREATE POLICY "Allow public update to employees" ON public.employees FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to employees" ON public.employees;
CREATE POLICY "Allow public delete to employees" ON public.employees FOR DELETE USING (true);


-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT ('rec-' || gen_random_uuid()),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    hours_worked TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Present',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);

-- Row Level Security (RLS) Policies for Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to attendance" ON public.attendance;
CREATE POLICY "Allow public read access to attendance" ON public.attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to attendance" ON public.attendance;
CREATE POLICY "Allow public insert to attendance" ON public.attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to attendance" ON public.attendance;
CREATE POLICY "Allow public update to attendance" ON public.attendance FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to attendance" ON public.attendance;
CREATE POLICY "Allow public delete to attendance" ON public.attendance FOR DELETE USING (true);


-- 3. SEED DEFAULT TEAM MEMBERS
INSERT INTO public.employees (id, name, shift_start, shift_end)
VALUES
    ('emp-1', 'Sabin', '12:00', '20:00'),
    ('emp-2', 'Charlie', '09:00', '17:00'),
    ('emp-3', 'Ujjwal', '22:00', '05:00'),
    ('emp-4', 'Leo', '05:00', '13:00')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    shift_start = EXCLUDED.shift_start, 
    shift_end = EXCLUDED.shift_end;
