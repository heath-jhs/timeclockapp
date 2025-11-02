// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeHistory from './components/EmployeeHistory';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session?.user?.email); // DEBUG

      if (session) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        console.log('Profile:', profile, 'Error:', error); // DEBUG

        if (profile) {
          const fullUser = { ...session.user, ...profile };
          console.log('Full user:', fullUser); // DEBUG
          setUser(fullUser);
        } else {
          console.error('No profile found');
          // Create default employee profile
          const { data: newProfile } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              role: 'employee'
            })
            .select()
            .single();
          setUser({ ...session.user, ...newProfile });
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        if (session) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser({ ...session.user, ...profile });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  if (!user) return <Login />;

  console.log('Rendering with role:', user.role); // DEBUG

  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div className="p-8">
    <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
    <p>User role: <code>{user.role || 'undefined'}</code></p>
    <p>User ID: <code>{user.id}</code></p>
    <button onClick={() => supabase.auth.signOut()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">
      Sign Out
    </button>
  </div>;
}

export default App;
