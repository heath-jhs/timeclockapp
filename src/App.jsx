import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Use singleton import
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';
const App = () => {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [user, setUser] = useState(null);
const [error, setError] = useState(null);
const [appError, setAppError] = useState(null);
useEffect(() => {
const checkSession = async () => {
try {
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError) {
console.error('Session error:', sessionError);
throw sessionError;
}
if (session) {
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError) {
console.error('User fetch error:', userError);
throw userError;
}
console.log('Session refreshed - User ID:', user.id);
await checkPasswordStatus(user.id);
setUser(user);
} else {
console.log('No active session - redirecting to login');
setUser(null);
}
} catch (err) {
console.error('Session check failed:', err);
setAppError(err.message);
}
};
checkSession();
const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
console.log('Auth state change:', event);
if (session) {
await checkPasswordStatus(session.user.id);
}
setUser(session?.user ?? null);
});
return () => {
authListener.subscription.unsubscribe();
};
}, []);
const checkPasswordStatus = async (userId) => {
const { data: profile, error } = await supabase.from('profiles').select('has_password').eq('id', userId).single();
if (error) {
console.error('Profile fetch error:', error);
return;
}
if (!profile.has_password) {
window.location.href = '/set-password'; // Force redirect if no password set
}
};
const login = async () => {
try {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
const { data: refreshed } = await supabase.auth.getUser();
await checkPasswordStatus(refreshed.user.id);
setUser(refreshed.user);
console.log('User app_metadata:', refreshed.user.app_metadata);
setError(null);
} catch (err) {
setError(err.message);
}
};
const logout = async () => {
try {
await supabase.auth.signOut();
setUser(null);
console.log('Logged out successfully');
} catch (err) {
console.error('Logout error:', err);
setAppError(err.message);
}
};
if (appError) {
return (
      
        App Error
        {appError}
        <button onclick="{()" &#x3D;=""> window.location.reload()}>Retry</button>
      
    );
  }
  if (!user) {
    return (
      
        Login
        {error && {error}}
         setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
         setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <button onclick="{login}" style="{{" width:="" &#x27;100%&#x27;,="" background:="" &#x27;#48bb78&#x27;,="" color:="" &#x27;white&#x27;,="" padding:="" &#x27;0.75rem&#x27;,="" borderradius:="" &#x27;0.375rem&#x27;,="" border:="" &#x27;none&#x27;,="" cursor:="" &#x27;pointer&#x27;="" }}="">Login</button>
      
    );
  }
  const role = user.app_metadata?.role || 'Employee';
  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <navigate to="/">;
    return <employeedashboard logout="{logout}" userid="{id" ?="" id="" :="" undefined}="">;
  };
  return (
    <router>
      <routes>
        <route path="/" element="{role" &#x3D;="=" &#x27;admin&#x27;="" ?="" &#x3C;admindashboard="" logout="{logout}"> : <employeedashboard logout="{logout}">} />
        <route path="/set-password" element="{<SetPassword">} />
        <route path="/employee-dashboard/:id" element="{<EmployeeDashboardWrapper">} />
        <route path="*" element="{<Navigate" to="/">} />
      </route></route></route></employeedashboard></route></routes>
    </router>
  );
};
export default App;</employeedashboard></navigate>
