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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkAdminRole(session?.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkAdminRole(session?.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (currentUser) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    setIsAdmin(data?.role === 'admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Simple Nav */}
        {user && (
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">TimeClock</h1>
              <div className="flex gap-4 text-sm">
                <a href="/clockin" className="text-gray-700 hover:text-primary">Clock In</a>
                {isAdmin && <a href="/admin" className="text-gray-700 hover:text-primary">Admin</a>}
                <a href="/profile" className="text-gray-700 hover:text-primary">Profile</a>
                <a href="/settings" className="text-gray-700 hover:text-primary">Settings</a>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        )}

        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={user ? <Navigate to="/clockin" /> : <Auth onLogin={setUser} />}
          />

          {/* Protected */}
          <Route
            path="/clockin"
            element={user ? <ClockIn user={user} /> : <Navigate to="/" />}
          />
          <Route
            path="/profile"
            element={user ? <Profile user={user} /> : <Navigate to="/" />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/" />}
          />

          {/* Admin Only */}
          <Route
            path="/admin"
            element={isAdmin ? <AdminDashboard /> : <Navigate to="/clockin" />}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
