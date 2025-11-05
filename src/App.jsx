// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

// ---------------------------------------------------------------------
// Supabase client – reads from VITE_ env vars (works on Netlify, Vercel, etc.)
// ---------------------------------------------------------------------
const supabase = createBrowserSupabaseClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export { supabase };

// ---------------------------------------------------------------------
// Auth helpers (plain JS – no TypeScript)
// ---------------------------------------------------------------------
function RequireAuth({ children }) {
  const { session, isLoading } = supabase.auth.useSession();

  if (isLoading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Loading…</div>;
  }
  return session ? children : <Navigate to="/login" replace />;
}

function RequireRole({ role, children }) {
  const { session, isLoading } = supabase.auth.useSession();

  if (isLoading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Loading…</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Role comes from profiles.role (or user_metadata if you set it on signup)
  const userRole =
    session.user?.user_metadata?.role ??
    session.user?.app_metadata?.role ??
    null;

  if (userRole !== role) {
    const redirectTo = userRole === 'admin' ? '/admin' : '/employee';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

// ---------------------------------------------------------------------
// Page imports – create empty stubs if they don’t exist yet
// ---------------------------------------------------------------------
import Login from './pages/Login';
import InviteSetup from './pages/InviteSetup';
import EmployeeSplash from './pages/EmployeeSplash';
import EmployeeSettings from './pages/EmployeeSettings';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSites from './pages/admin/AdminSites';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminReports from './pages/admin/AdminReports';

// ---------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------
export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>

          {/* ---------- Public ---------- */}
          <Route path="/login" element={<Login />} />
          <Route path="/invite" element={<InviteSetup />} />

          {/* ---------- Employee ---------- */}
          <Route
            path="/employee"
            element={
              <RequireAuth>
                <RequireRole role="employee">
                  <EmployeeSplash />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/employee/settings"
            element={
              <RequireAuth>
                <RequireRole role="employee">
                  <EmployeeSettings />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* ---------- Admin ---------- */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole role="admin">
                  <AdminDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/sites"
            element={
              <RequireAuth>
                <RequireRole role="admin">
                  <AdminSites />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <RequireAuth>
                <RequireRole role="admin">
                  <AdminEmployees />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAuth>
                <RequireRole role="admin">
                  <AdminReports />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* ---------- Catch-all ---------- */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}
