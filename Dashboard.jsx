// src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import EmployeeDashboard from './EmployeeDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
        setIsAdmin(user?.user_metadata?.is_admin || false);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return isAdmin ? <AdminDashboard user={user} /> : <EmployeeDashboard user={user} />;
}
