// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import ClockIn from './components/ClockIn';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root: Logged in → /clockin, else → Auth (magic link only) */}
        <Route
          path="/"
          element={user ? <Navigate to="/clockin" replace /> : <Auth />}
        />

        {/* Protected Routes */}
        <Route
          path="/clockin"
          element={user ? <ClockIn user={user} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={user ? <Profile user={user} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={user ? <Settings /> : <Navigate to="/" replace />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
