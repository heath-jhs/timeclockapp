// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignSiteId, setAssignSiteId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignStartTime, setAssignStartTime] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignEndTime, setAssignEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, full_name, email, is_admin');
        if (usersError) throw new Error(`Profiles error: ${usersError.message}`);
        setUsers(usersData || []);
        const { data: sitesData, error: sitesError } = await supabase.from('sites').select('*');
        if (sitesError) throw new Error(`Sites error: ${sitesError.message}`);
        setSites(sitesData || []);
        const current = new Date().toISOString();
        const { data: assignData, error: assignError } = await supabase
          .from('employee_sites')
          .select('*, profiles!employee_sites_employee_id_fkey(full_name), sites!employee_sites_site_id_fkey(name, latitude, longitude)')
          .or(`end_datetime.gt.${current},end_datetime.is.null`);
        if (assignError) throw assignError;
        setActiveAssignments(assignData || []);
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
    try {
      const response = await fetch(`/.netlify/functions/geocode?address=${encodeURIComponent(newSiteAddress)}`);
      const data = await response.json();
      if (data.status !== 'OK') throw new Error('Geocoding failed');
      const { lat, lng } = data.results[0].geometry.location;
      const { error } = await supabase.from('sites').insert({ name: newSiteName, latitude: lat, longitude: lng });
      if (error) throw error;
      setNewSiteName('');
      setNewSiteAddress('');
      const { data: sitesData } = await supabase.from('sites').select('*');
      setSites(sitesData || []);
    } catch (err) {
      setError(err.message || 'Error creating site');
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
      const current = new Date().toISOString();
      const { data: assignData } = await supabase
        .from('employee_sites')
        .select('*, profiles!employee_sites_employee_id_fkey(full_name), sites!employee_sites_site_id_fkey(name, latitude, longitude)')
        .or(`end_datetime.gt.${current},end_datetime.is.null`);
      setActiveAssignments(assignData || []);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    let query = supabase.from('clock_ins').select('*, profiles!clock_ins_user_id_fkey(full_name)').eq('profiles.is_admin', 'false');
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

  const handleToggleAdmin = async (userId, currentIsAdmin) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId);
    if (error) setError(error.message || 'Error updating admin status');
    else {
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.inviteUserByEmail(inviteEmail);
      if (error) throw error;
      setInviteEmail('');
      alert('Invite sent! They can sign up via the email link.');
      const { data: usersData } = await supabase.from('profiles').select('id, full_name, email, is_admin');
      setUsers(usersData || []);
    } catch (err) {
      setError(err.message || 'Error inviting user');
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

      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Staff Map View</h2>
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
          <GoogleMap mapContainerStyle={{ height: '400px', width: '100%' }} center={{ lat: 0, lng: 0 }} zoom={2}>
            {activeAssignments.map((a, i) => (
              a.sites.latitude && a.sites.longitude && <Marker key={i} position={{ lat: a.sites.latitude, lng: a.sites.longitude }} title={a.profiles.full_name + ' at ' + a.sites.name} />
            ))}
          </GoogleMap>
        </LoadScript>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">User Management</h2>
          <form onSubmit={handleInviteUser} className="mb-4">
            <input 
              type="email" 
              placeholder="Enter email to invite" 
              value={inviteEmail} 
              onChange={(e) => setInviteEmail(e.target.value)} 
              className="border p-2 w-full mb-2" 
              required 
            />
            <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 w-full">Invite New User</button>
          </form>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Full Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map(u => (
                <tr key={u.id} className="hover:bg-gray-100">
                  <td className="border p-2">{u.full_name}</td>
                  <td className="border p-2">{u.email || 'N/A'}</td>
                  <td className="border p-2 text-center">
                    <input 
                      type="checkbox" 
                      checked={u.is_admin} 
                      onChange={() => handleToggleAdmin(u.id, u.is_admin)} 
                    />
                  </td>
                </tr>
              )) : <tr><td colSpan="3" className="border p-2 text-center">No users yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Sites</h2>
          <ul className="list-disc pl-5">{sites.length ? sites.map(s => <li key={s.id} className="mb-2">{s.name}</li>) : <li>No sites yet</li>}</ul>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Create Site</h2>
        <form onSubmit={handleCreateSite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Site name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="border p-2" required />
          <input type="text" placeholder="Address (e.g., 1600 Amphitheatre Pkwy, Mountain View, CA)" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} className="border p-2" required />
          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 md:col-span-2">Create</button>
        </form>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Assign Employee to Site</h2>
        <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} className="border p-2" required>
            <option value="">Select Employee</option>
            {users.filter(u => !u.is_admin).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
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
