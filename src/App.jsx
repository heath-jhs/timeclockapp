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
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const type = params.get('type');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if ((type === 'signup' || type === 'invite') && accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (setSessionError) throw setSessionError;
            history.replaceState(null, null, window.location.pathname);
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          setUser(user);

          const { data: profile, error: profileError } = await supabase.from('profiles').select('role, has_password').eq('id', user.id).single();
          if (profileError) throw profileError;

          setRole(profile.role || 'Employee');
          if (!profile.has_password) {
            navigate('/set-password');
            return;
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
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#dc2626' }}>Application Error</h1>
        <p style={{ margin: '20px 0', color: '#374151' }}>{appError}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loadingSession) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Loading Session...</h2>
        <p style={{ color: '#6b7280', marginTop: '16px' }}>
          Open browser console (F12) if this takes too long.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>Login</h1>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <button 
          onClick={login} 
          style={{ width: '100%', background: '#22c55e', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
      </div>
    );
  }

  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <Navigate to="/" />;
    return <EmployeeDashboard logout={logout} userId={id} />;
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
