import React, { useState, useEffect, useRef } from 'react';
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  const [hashProcessed, setHashProcessed] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let mounted = true;
    let authListener = null;

    const initializeAuth = async () => {
      try {
        console.log('App: Initializing auth flow...');

        // Handle invite hash
        if (location.hash && !hashProcessed) {
          const hash = location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const type = params.get('type');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if ((type === 'signup' || type === 'invite' || type === 'recovery') && accessToken && refreshToken) {
            console.log('App: Processing invite hash...');
            setHashProcessed(true);
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) throw error;
            window.history.replaceState({}, '', '/set-password');
            return;
          }
        }

        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (mounted) setLoadingSession(false);
          return;
        }

        // Get profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, has_password')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        if (mounted) {
          setUser(session.user);
          setRole(profile.role || 'Employee');

          if (!profile.has_password && location.pathname !== '/set-password') {
            navigate('/set-password', { replace: true });
          } else if (profile.has_password && location.pathname === '/set-password') {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error('App: Auth init error:', err);
        if (mounted) setAppError(err.message || 'Session failed');
      } finally {
        if (mounted) setLoadingSession(false);
      }
    };

    initializeAuth();

    // Global listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('App: Auth event:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, has_password')
            .eq('id', session.user.id)
            .single();

          setRole(profile?.role || 'Employee');

          if (!profile?.has_password) {
            navigate('/set-password', { replace: true });
          } else if (location.pathname === '/set-password') {
            navigate('/', { replace: true });
          }
        } catch (err) {
          console.error('Profile load error:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole('Employee');
        navigate('/', { replace: true });
      }
    });

    authListener = listener;

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, location, hashProcessed]);

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
        <p style={{ color: '#6b7280' }}>Please wait while we connect to your account...</p>
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

  return (
    <Routes>
      <Route path="/" element={role === 'Admin' || role === 'Manager' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
