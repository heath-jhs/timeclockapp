// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

const supabase = createBrowserSupabaseClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export { supabase };

// Auth helpers (plain JS)
function RequireAuth({ children }) {
  const { session, isLoading } = supabase.auth.useSession();
  if (isLoading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading…</div>;
  return session ? children : <Navigate to="/login" replace />;
}

function RequireRole({ role, children }) {
  const { session, isLoading } = supabase.auth.useSession();
  if (isLoading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;

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

// Imports – respecting your existing components structure
import Login from './components/auth/Login';  // ← YOUR EXISTING/RESTORED LOGIN
import InviteSetup from './pages/InviteSetup';  // Create if missing (from earlier)
import EmployeeSplash from './pages/EmployeeSplash';  // You have this
import EmployeeSettings from './pages/EmployeeSettings';  // Stub if needed

// Admin – assuming your existing in components (adjust if wrong)
import AdminDashboard from './components/AdminDashboard';
import AdminSites from './components/AdminSites';
import AdminEmployees from './components/AdminEmployees';
import AdminReports from './components/AdminReports';

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/invite" element={<InviteSetup />} />

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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}
