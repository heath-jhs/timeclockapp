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
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignStartTime, setAssignStartTime] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignEndTime, setAssignEndTime] = useState('');
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
      const { data: sitesData } = await supabase.from('sites').select('*');
      setSites(sitesData || []);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    const startDatetime = assignStartDate && assignStartTime ? new Date(`${assignStartDate}T${assignStartTime}`).toISOString() : null;
    const endDatetime = assignEndDate && assignEndTime ? new Date(`${assignEndDate}T${assignEndTime}`).toISOString() : null;
    const { error } = await supabase.from('employee_sites').insert({
      employee_id: assignEmployeeId,
      site_id: assignSiteId,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    });
    if (error) setError(error.message);
    else {
      setAssignEmployeeId('');
      setAssignSiteId('');
      setAssignStartDate('');
      setAssignStartTime('');
      setAssignEndDate('');
      setAssignEndTime('');
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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-4">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-gray-600 mb-4">Welcome, Admin {user?.user_metadata?.full_name || ''}</p>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Logout</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Users</h2>
          <ul className="list-disc pl-5">{users.length ? users.map(u => <li key={u.id} className="mb-2">{u.full_name}</li>) : <li>No users yet</li>}</ul>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Sites</h2>
          <ul className="list-disc pl-5">{sites.length ? sites.map(s => <li key={s.id} className="mb-2">{s.name}</li>) : <li>No sites yet</li>}</ul>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Create Site</h2>
        <form onSubmit={handleCreateSite} className="flex flex-col md:flex-row items-center">
          <input type="text" placeholder="Site name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="border p-2 m-2 flex-grow" required />
          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 m-2">Create</button>
        </form>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Assign Employee to Site</h2>
        <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} className="border p-2" required>
            <option value="">Select Employee</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <select value={assignSiteId} onChange={(e) => setAssignSiteId(e.target.value)} className="border p-2" required>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={assignStartDate} onChange={(e) => setAssignStartDate(e.target.value)} className="border p-2" placeholder="Start Date" />
          <input type="time" value={assignStartTime} onChange={(e) => setAssignStartTime(e.target.value)} className="border p-2" placeholder="Start Time" />
          <input type="date" value={assignEndDate} onChange={(e) => setAssignEndDate(e.target.value)} className="border p-2" placeholder="End Date" />
          <input type="time" value={assignEndTime} onChange={(e) => setAssignEndTime(e.target.value)} className="border p-2" placeholder="End Time" />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 md:col-span-2">Assign</button>
        </form>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Reports</h2>
        <form onSubmit={handleGenerateReport} className="flex flex-col md:flex-row items-center">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 m-2 flex-grow" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 m-2 flex-grow" />
          <button type="submit" className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 m-2">Generate Report</button>
        </form>
        {reports.length > 0 && (
          <table className="w-full border mt-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">User</th>
                <th className="border p-2">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} className="hover:bg-gray-100">
                  <td className="border p-2">{r.full_name}</td>
                  <td className="border p-2">{r.hours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
