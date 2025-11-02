// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: usersData } = await supabase.from('profiles').select('*'); // Profiles if exists; else adjust
        setUsers(usersData || []);
        const { data: sitesData } = await supabase.from('sites').select('*');
        setSites(sitesData || []);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      <p>Welcome, Admin {user?.user_metadata?.full_name || ''}</p>
      <h2>Users</h2>
      <ul>{users.map(u => <li key={u.id}>{u.full_name}</li>)}</ul>
      <h2>Sites</h2>
      <ul>{sites.map(s => <li key={s.id}>{s.name}</li>)}</ul>
      {/* Add assignment form here later */}
    </div>
  );
}
