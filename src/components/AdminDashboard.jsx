// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignSiteId, setAssignSiteId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState([]);

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

  const handleCreateSite = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('sites').insert({ name: newSiteName });
    if (error) setError(error.message);
    else {
      setNewSiteName('');
      // Refresh sites
      const { data: sitesData } = await supabase.from('sites').select('*');
      setSites(sitesData || []);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('employee_sites').insert({ employee_id: assignEmployeeId, site_id: assignSiteId });
    if (error) setError(error.message);
    else {
      setAssignEmployeeId('');
      setAssignSiteId('');
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    let query = supabase.from('clock_ins').select('*, profiles(full_name)').eq('profiles.is_admin', 'false');
    if (startDate) query = query.gte('time_in', startDate);
    if (endDate) query = query.lte('time_in', endDate);
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      const summedHours = data.reduce((acc, entry) => {
        const userId = entry.user_id;
        const hours = entry.time_out ? (new Date(entry.time_out) - new Date(entry.time_in)) / 3600000 : 0;
        if (!acc[userId]) acc[userId] = { full_name: entry.profiles.full_name, hours: 0 };
        acc[userId].hours += hours;
        return acc;
      }, {});
      setReports(Object.values(summedHours));
    }
  };

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
      <h2>Create Site</h2>
      <form onSubmit={handleCreateSite}>
        <input type="text" placeholder="Site name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="border p-2 m-2" required />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Create</button>
      </form>
      <h2>Assign Employee to Site</h2>
      <form onSubmit={handleAssign}>
        <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} className="border p-2 m-2" required>
          <option value="">Select Employee</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <select value={assignSiteId} onChange={(e) => setAssignSiteId(e.target.value)} className="border p-2 m-2" required>
          <option value="">Select Site</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Assign</button>
      </form>
      <h2>Reports</h2>
      <form onSubmit={handleGenerateReport}>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 m-2" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 m-2" />
        <button type="submit" className="bg-purple-500 text-white px-4 py-2 rounded">Generate Report</button>
      </form>
      {reports.length > 0 && (
        <table className="border mt-4">
          <thead>
            <tr>
              <th className="border p-2">User</th>
              <th className="border p-2">Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.full_name}</td>
                <td className="border p-2">{r.hours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
