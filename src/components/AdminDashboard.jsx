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
        const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
        if (profilesError) throw new Error(`Profiles error: ${profilesError.message}`);
        
        const { data: authUsers, error: authError } = await supabase.schema('auth').from('users').select('id, email');
        if (authError) throw new Error(`Auth users error: ${authError.message}`);
        
        const mergedUsers = profilesData.map(p => ({
          ...p,
          email: authUsers.find(u => u.id === p.id)?.email || 'N/A'
        }));
        setUsers(mergedUsers || []);
        
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
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(newSiteAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`);
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
      // Refresh users
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const { data: authUsers } = await supabase.schema('auth').from('users').select('id, email');
      const mergedUsers = profilesData.map(p => ({
        ...p,
        email: authUsers.find(u => u.id === p.id)?.email || 'N/A'
      }));
      setUsers(mergedUsers || []);
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
          <form onSubmit={handleInviteUser} className="mb
