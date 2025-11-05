// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createBrowserSupabaseClient } from '@supabase/supabase-js';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';

const supabase = createBrowserSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export { supabase };

function RequireAuth({ children }) {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ role, children }) {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;

  const userRole = session.user?.user_metadata?.role || null;
  if (userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/employee'} replace />;
  }
  return children;
}

// YOUR REAL FILES
import Login from './components/auth/Login';
import InviteSetup from './pages/InviteSetup';
import EmployeeSplash from './pages/EmployeeSplash';
import EmployeeSettings from './pages/EmployeeSettings';
import AdminDashboard from './components/AdminDashboard';
import AssignSites from './components/AssignSites';
import ClockIn from './components/ClockIn';

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/invite" element={<InviteSetup />} />

          {/* Employee */}
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
            path="/employee/clockin"
            element={
              <RequireAuth>
                <RequireRole role="employee">
                  <ClockIn />
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

          {/* Admin */}
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
                  <AssignSites />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}
