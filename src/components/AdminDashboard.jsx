import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthProvider';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  height: '400px',
  width: '100%'
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchSites();
      fetchUsers();
    }
  }, [user]);

  const fetchSites = async () => {
    const { data, error } = await supabase.from('sites').select('*');
    if (error) console.error(error);
    else setSites(data || []);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/.netlify/functions/list-users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Geocoding address:', siteAddress);
      const res = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: siteAddress }),
      });
      console.log('Full geocode response status:', res.status, 'ok:', res.ok);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Geocode function error: ' + res.status);
      }
      const { lat, lng } = await res.json();
      console.log('Geocode success:', lat, lng);
      const { error: insertError } = await supabase
        .from('sites')
        .insert({ name: siteName, address: siteAddress, lat, lng });
      if (insertError) throw insertError;
      setSiteName('');
      setSiteAddress('');
      fetchSites();
    } catch (err) {
      console.error('Geocode/create error:', err);
      setError('Geocoding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signUp({
        email: userEmail,
        password: userPassword,
        options: { data: { is_admin: isAdmin } },
      });
      if (error) throw error;
      setUserEmail('');
      setUserPassword('');
      setIsAdmin(false);
      fetchUsers();
    } catch (err) {
      console.error('User create error:', err);
      setError('User creation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
          Logout
        </button>
      </div>
      {error && <p className="text-red-600 bg-red-100 p-4 rounded mb-6 border border-red-300">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add Site</h2>
          <form onSubmit={handleCreateSite} className="space-y-4">
            <input
              type="text"
              placeholder="Site Name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Site Address (e.g., 1600 Amphitheatre Parkway, Mountain View, CA)"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button 
              type="submit" 
              disabled={loading} 
              className={`bg-blue-500 text-white p-3 w-full rounded hover:bg-blue-600 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </form>
          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-700">Sites</h2>
          <ul className="space-y-2">
            {sites.map((site) => (
              <li key={site.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                {site.name} - {site.address} ({site.lat}, {site.lng})
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Sites Map</h2>
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
            <GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat: 37.422, lng: -122.084 }} zoom={3}>
              {sites.map((site) => site.lat && site.lng && (
                <Marker key={site.id} position={{ lat: Number(site.lat), lng: Number(site.lng) }} title={site.name} />
              ))}
            </GoogleMap>
          </LoadScript>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <input
              type="email"
              placeholder="User Email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="password"
              placeholder="User Password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="form-checkbox" />
              <span>Admin?</span>
            </label>
            <button 
              type="submit" 
              disabled={loading} 
              className={`bg-green-500 text-white p-3 w-full rounded hover:bg-green-600 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : 'Add User'}
            </button>
          </form>
          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-700">Users</h2>
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                {user.email} - {user.user_metadata.is_admin ? 'Admin' : 'Employee'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
