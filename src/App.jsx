import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';

const App = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('Employee');
  const [error, setError] = useState(null);
  const [appError, setAppError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Handle magic link hash if present (e.g., from invite email)
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const type = params.get('type');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if ((type === 'signup' || type === 'invite') && accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (setSessionError) throw setSessionError;
            // Clear hash to prevent re-processing
            history.replaceState(null, null, window.location.pathname);
          }
        }
        // Now get the current session (from storage or just set)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          setUser(user);
          // Fetch role and has_password
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role, has_password').eq('id', user.id).single();
          if (profileError) throw profileError;
          setRole(profile.role || 'Employee');
          if (!profile.has_password) {
            navigate('/set-password');
            return; // Prevent further execution until setup complete
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setAppError(err.message);
      } finally {
        setLoadingSession(false);
      }
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('role, has_password').eq('id', session.user.id).single();
        setRole(profile?.role || 'Employee');
        if (!profile?.has_password) {
          navigate('/set-password');
        }
      } else {
        setUser(null);
        setRole('Employee');
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  const login = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed.user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', refreshed.user.id).single();
      setRole(profile?.role || 'Employee');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole('Employee');
    } catch (err) {
      console.error('Logout error:', err);
      setAppError(err.message);
    }
  };

  if (appError) {
    return (
      <div>
        <h1>App Error</h1>
        <p>{appError}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#4299e1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }
  if (loadingSession) {
    return <div>Loading...</div>;
  }
  if (!user) {
    return (
      <div>
        <h1>Login</h1>
        {error && (
          <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
        <button onClick={login} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>
          Login
        </button>
      </div>
    );
  }
  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <Navigate to="/" />;
    return <EmployeeDashboard logout={logout} userId={id ? id : undefined} />;
  };
  return (
    <Routes>
      <Route path="/" element={role === 'Admin' || role === 'Manager' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/employee-dashboard/:id" element={<EmployeeDashboardWrapper />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
