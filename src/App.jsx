import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import Settings from './pages/Settings.jsx';
import { useGeofence } from './hooks/useGeofence';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { startTracking, stopTracking } = useGeofence();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.user_metadata?.role === 'employee') {
        startTracking();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.role === 'employee') {
        startTracking();
      } else {
        stopTracking();
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={
            session ? (
              session.user.user_metadata.role === 'admin' ? (
                <AdminDashboard />
              ) : (
                <EmployeeDashboard />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/settings" element={session ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
