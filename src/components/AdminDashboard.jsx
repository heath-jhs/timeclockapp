// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
        if (usersError) throw new Error(`Profiles error: ${usersError.message}`);
        setUsers(usersData || []);
        const { data: sitesData, error: sitesError } = await supabase.from('sites').select('*');
        if (sitesError) throw new Error(`Sites error: ${sitesError.message}`);
        setSites(sitesData || []);
      } catch (err) {
        setError(err.message || 'Error loading admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    window.location.href = '/';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      <p>Welcome, Admin {user?.user_metadata?.full_name || ''}</p>
      <h2>Users</h2>
      <ul>{users.length ? users.map(u => <li key={u.id}>{u.full_name}</li>) : <li>No users yet</li>}</ul>
      <h2>Sites</h2>
      <ul>{sites.length ? sites.map(s => <li key={s.id}>{s.name}</li>) : <li>No sites yet</li>}</ul>
      {/* Add assignment form, reports here next */}
    </div>
  );
}
