import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
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
      
        App Error
        {appError}
        <button onclick="{()" &#x3D;=""> window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#4299e1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Retry
        </button>
      
    );
  }
  if (loadingSession) {
    return Loading...;
  }
  if (!user) {
    return (
      
        Login
        {error && (
          
            {error}
          
        )}
         setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
         setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
        <button onclick="{login}" style="{{" width:="" &#x27;100%&#x27;,="" background:="" &#x27;#48bb78&#x27;,="" color:="" &#x27;white&#x27;,="" padding:="" &#x27;0.75rem&#x27;,="" borderradius:="" &#x27;0.375rem&#x27;,="" border:="" &#x27;none&#x27;,="" cursor:="" &#x27;pointer&#x27;="" }}="">
          Login
        </button>
      
    );
  }
  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <navigate to="/">;
    return <employeedashboard logout="{logout}" userid="{id" ?="" id="" :="" undefined}="">;
  };
  return (
    <routes>
      <route path="/" element="{role" &#x3D;="=" &#x27;admin&#x27;="" ||="" role="==" &#x27;manager&#x27;="" ?="" &#x3C;admindashboard="" logout="{logout}"> : <employeedashboard logout="{logout}">} />
      <route path="/set-password" element="{<SetPassword">} />
      <route path="/employee-dashboard/:id" element="{<EmployeeDashboardWrapper">} />
      <route path="*" element="{<Navigate" to="/">} />
    </route></route></route></employeedashboard></route></routes>
  );
};
export default App;
---
File: /src/components/SetPassword.jsx
---
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Prefill name from profile
        const { data: profile } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).single();
        if (profile) {
          setName(profile.full_name || '');
          setPhone(profile.phone_number || '');
        }
      }
    };
    fetchUserAndProfile();
  }, []);
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: name,
        phone_number: phone,
        has_password: true
      }).eq('id', userId);
      if (profileError) throw profileError;
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style="{{" padding:="" &#x27;20px&#x27;,="" maxwidth:="" &#x27;400px&#x27;,="" margin:="" &#x27;0="" auto&#x27;="" }}="">
      <h1 style="{{" color:="" &#x27;#1a202c&#x27;,="" fontsize:="" &#x27;1.875rem&#x27;,="" fontweight:="" &#x27;bold&#x27;="" }}="">Set Password</h1>
      {error &#x26;&#x26; <p style="{{" color:="" &#x27;#9b2c2c&#x27;,="" background:="" &#x27;#fed7d7&#x27;,="" padding:="" &#x27;1rem&#x27;,="" borderradius:="" &#x27;0.5rem&#x27;,="" marginbottom:="" &#x27;1rem&#x27;="" }}="">{error}</p>}
      <form onsubmit="{handleSetPassword}">
        <input type="text" placeholder="Full Name" value="{name}" onchange="{e" &#x3D;=""> setName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} required />
        <input type="tel" placeholder="Phone Number (optional)" value="{phone}" onchange="{e" &#x3D;=""> setPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <input type="password" placeholder="New Password" value="{password}" onchange="{e" &#x3D;=""> setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} required />
        <input type="password" placeholder="Confirm Password" value="{confirmPassword}" onchange="{e" &#x3D;=""> setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} required />
        <button type="submit" disabled="{loading}" style="{{" width:="" &#x27;100%&#x27;,="" background:="" &#x27;#48bb78&#x27;,="" color:="" &#x27;white&#x27;,="" padding:="" &#x27;0.75rem&#x27;,="" borderradius:="" &#x27;0.375rem&#x27;,="" border:="" &#x27;none&#x27;,="" cursor:="" &#x27;pointer&#x27;="" }}="">
          {loading ? 'Setting...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};
export default SetPassword;</employeedashboard></navigate>
