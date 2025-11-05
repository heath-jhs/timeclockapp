// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from '@supabase/auth-helpers-react';
import { supabase } from './supabaseClient';   // <-- your client export

import Login from './pages/Login';
import InviteSetup from './pages/InviteSetup';
import EmployeeSplash from './pages/EmployeeSplash';
import EmployeeSettings from './pages/EmployeeSettings';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSites from './pages/admin/AdminSites';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminReports from './pages/admin/AdminReports';

// ---------------------------------------------------------------------
// Helper: redirect if NOT logged in
// ---------------------------------------------------------------------
function RequireAuth({ children }) {
  const { data: { session }, isLoading } = supabase.auth.useSession();

  if (isLoading) return <div style={{ padding: 20 }}>Loading…</div>;
  return session ? children : <Navigate to="/login" replace />;
}

// ---------------------------------------------------------------------
// Helper: redirect if user does NOT have required role
// ---------------------------------------------------------------------
function RequireRole({ role, children }) {
  const { data: { session }, isLoading } = supabase.auth.useSession();

  if (isLoading) return <div style={{ padding: 20 }}>Loading…</div>;

  if (!session) return <Navigate to="/login" replace />;

  // Role is stored in profiles.role (employee | admin)
  const userRole = session.user?.user_metadata?.role
    ?? session.user?.app_metadata?.role
    ?? null;

  if (userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return children;
}

// ---------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------
export default function App() {
  return (
    <SupabaseProvider client={supabase}>
      <BrowserRouter>
        <Routes>

          {/* ------------------ Public ------------------ */}
          <Route path="/login" element={<Login />} />
          <Route path="/invite" element={<InviteSetup />} />

          {/* ------------------ Employee ------------------ */}
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

          {/* ------------------ Admin ------------------ */}
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

          {/* ------------------ Catch-all ------------------ */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SupabaseProvider>
  );
}
