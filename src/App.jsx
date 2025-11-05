import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';

const supabase = createClient(
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

// YOUR FILES
import Login from './pages/Login';
import InviteSetup from './pages/InviteSetup';
import EmployeeSplash from './pages/EmployeeSplash';
import EmployeeSettings from './pages/EmployeeSettings';
import AdminDashboard from './pages/AdminDashboard';
import AssignSites from './components/AssignSites';
import ClockIn from './components/ClockIn';

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}
