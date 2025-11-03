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
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error(error);
    else setUsers(data || []);
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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      {error && <p className="text-red-500 mb-4 p-2 border border-red-500 rounded">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Add Site</h2>
          <form onSubmit={handleCreateSite} className="mb-8">
            <input
              type="text"
              placeholder="Site Name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="border p-2 mr-2 w-full mb-2"
              required
            />
            <input
              type="text"
              placeholder="Site Address (e.g., 1600 Amphitheatre Parkway, Mountain View, CA)"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              className="border p-2 mr-2 w-full mb-2"
              required
            />
            <button type="submit" disabled={loading} className="bg-blue-500 text-white p-2 w-full">
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </form>
          <h2 className="text-xl font-semibold mb-2">Sites</h2>
          <ul>
            {sites.map((site) => (
              <li key={site.id}>{site.name} - {site.address} ({site.lat}, {site.lng})</li>
            ))}
          </ul>
        </div>
        <div className="card bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Sites Map</h2>
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
            <GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat: 37.422, lng: -122.084 }} zoom={3}>
              {sites.map((site) => site.lat && site.lng && (
                <Marker key={site.id} position={{ lat: Number(site.lat), lng: Number(site.lng) }} title={site.name} />
              ))}
            </GoogleMap>
          </LoadScript>
        </div>
        <div className="card bg-white p-4 rounded shadow md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <form onSubmit={handleCreateUser} className="mb-8">
            <input
              type="email"
              placeholder="User Email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="border p-2 mr-2 w-full mb-2"
              required
            />
            <input
              type="password"
              placeholder="User Password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="border p-2 mr-2 w-full mb-2"
              required
            />
            <label className="mr-2">
              Admin? <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            </label>
            <button type="submit" disabled={loading} className="bg-green-500 text-white p-2 w-full">
              {loading ? 'Creating...' : 'Add User'}
            </button>
          </form>
          <ul>
            {users.map((user) => (
              <li key={user.id}>{user.email} - {user.user_metadata.is_admin ? 'Admin' : 'Employee'}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
