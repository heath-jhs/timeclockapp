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
    // ONLY use onAuthStateChange — getSession is unreliable after reload
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);

        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          console.log('Profile:', profile);

          if (profile) {
            setUser({ ...session.user, ...profile });
          } else {
            // Create default
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email,
                role: 'employee'
              })
              .select()
              .single();
            setUser({ ...session.user, ...newProfile });
          }
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

  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}

export default App;
