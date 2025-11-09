// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('Employee');
  const [error, setError] = useState(null);
  const [appError, setAppError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        console.log('App: Checking session and hash...');

        // Handle invite/confirmation hash FIRST
        if (location.hash) {
          const hash = location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const type = params.get('type');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if ((type === 'signup' || type === 'invite' || type === 'recovery') && accessToken && refreshToken) {
            console.log('App: Processing invite hash...');
            const setSessionPromise = supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('setSession() timed out')), 15000)
            );
            const { error: setSessionError } = await Promise.race([setSessionPromise, timeoutPromise]);
            if (setSessionError) throw setSessionError;

            console.log('App: Session set from hash, redirecting to /set-password');
            window.history.replaceState({}, '', '/set-password');
            if (mounted) {
              setLoadingSession(false);
              navigate('/set-password', { replace: true });
            }
            return;
          }
        }

        // Normal session check
        const getSessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession() timed out')), 15000)
        );
        const { data: { session }, error: sessionError } = await Promise.race([getSessionPromise, timeoutPromise]);
        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          console.log('App: Session found, user:', session.user.id);
          setUser(session.user);
          const profilePromise = supabase
            .from('profiles')
            .select('role, has_password')
            .eq('id', session.user.id)
            .single();
          const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timed out')), 10000)
          );
          const { data: profile, error: profileError } = await Promise.race([profilePromise, profileTimeout]);
          if (profileError) throw profileError;

          setRole(profile.role || 'Employee');
          if (!profile.has_password && location.pathname !== '/set-password') {
            console.log('App: User has no password, redirecting to /set-password');
            navigate('/set-password');
          }
        } else {
          console.log('App: No session found');
          setUser(null);
        }
      } catch (err) {
        console.error('App: Session check failed:', err);
        if (mounted) {
          setAppError(
            err.message.includes('timed out') 
              ? 'Connection timeout. Check your internet and try again.'
              : err.message || 'Failed to load session'
          );
        }
      } finally {
        if (mounted) setLoadingSession(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('App: Auth state changed:', event);
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_password')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || 'Employee');
        if (!profile?.has_password && location.pathname !== '/set-password') {
          navigate('/set-password');
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location]);

  const login = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed.user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', refreshed.user.id)
        .single();
      setRole(profile?.role || 'Employee');
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('Employee');
  };

  if (appError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error</h1>
        <p style={{ marginBottom: '1.5rem', color: '#374151' }}>{appError}</p>
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
        <h2 style={{ marginBottom: '1rem' }}>Loading Session...</h2>
        <p style={{ color: '#6b7280' }}>Be patient while we access your user account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>Login</h1>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
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
