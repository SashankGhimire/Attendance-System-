# WorkFlow Attendance Management System

WorkFlow Attendance is a clean, modern, and scalable employee attendance tracking application built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase Database**.

---

## Features

- **Splash Screen**: Modern, smooth animated splash screen with quick initialization.
- **Employee Station**: Select employee (**Sabin**, **Charlie**, **Ujjwal**, **Leo**), view shift schedule, and **Clock In** / **Clock Out**.
- **Reason Prompt**: Requests an explanation reason when clocking in late, leaving early, or taking overtime.
- **Overnight Shift Support**: Accurately calculates hours worked across midnight boundaries (e.g., 22:00 – 05:00 shifts).
- **Admin Dashboard & Reset Panel**: Secure Admin modal (`Admin` / `Admin@123`) with key KPI metrics, real-time activity table, team schedule editor, and data wipe controls.
- **Dual Mode (Local & Supabase)**: Runs instantly out-of-the-box using local storage state, or seamlessly synchronizes with a cloud Supabase database when configured.

---

## Quick Start (Local Run)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup (Optional for Supabase)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local` (works with both Vite and Next.js variable names):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*(If left blank or omitted, the application automatically runs in standalone local storage mode).*

### 3. Database Setup (Optional for Supabase)
If using Supabase, execute the SQL script in `supabase-schema.sql` inside your **Supabase SQL Editor** to create the database tables (`employees`, `attendance`) and seed default data. This schema matches the frontend data model.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Admin Credentials

- **Username**: `Admin`
- **Password**: `Admin@123`

