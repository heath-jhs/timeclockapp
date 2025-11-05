import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);
      } catch (err) {
        setError(err.message || 'Error loading user');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!user) return <div className="text-red-500">No user logged in</div>;

  if (user.user_metadata?.is_admin === 'true') {
    return <AdminDashboard user={user} />;
  } else {
    return <EmployeeDashboard />;
  }
}
