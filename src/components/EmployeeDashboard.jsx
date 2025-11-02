// src/components/EmployeeDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Fetch assigned site logic here (e.g., from a 'user_sites' table)
      // For now, placeholder: assume query to get site
      const { data: siteData } = await supabase.from('user_sites').select('site_name').eq('user_id', user.id).single();
      setSite(siteData ? siteData.site_name : null);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = '/login'; // Redirect to login page
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Employee Dashboard</h1>
      <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      <p>Welcome, {user?.user_metadata?.full_name || ''}</p>
      {site ? (
        <div>
          <p>Assigned to: {site}</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Clock In</button>
        </div>
      ) : (
        <p className="text-orange-500">Not assigned to any site</p>
      )}
    </div>
  );
}
