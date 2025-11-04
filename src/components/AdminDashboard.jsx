import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [tempAssigns, setTempAssigns] = useState({});
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [error, setError] = useState(null);
  const [mapType, setMapType] = useState('map');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/.netlify/functions/list-users');
        if (!res.ok) throw new Error(`Fetch users failed: ${res.status}`);
        const data = await res.json();
        setUsers(data);
        console.log('Fetched users:', data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      }
    };
    const fetchSites = async () => {
      try {
        const res = await fetch('/.netlify/functions/list-sites');
        if (!res.ok) throw new Error(`Fetch sites failed: ${res.status}`);
        const data = await res.json();
        setSites(data);
        console.log('Fetched sites:', data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      }
    };
    const fetchAssignments = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.from('employee_sites').select('*');
        if (error) throw error;
        const assigns = data.reduce((acc, { employee_id, site_id }) => {
          acc[employee_id] = acc[employee_id] || [];
          acc[employee_id].push(site_id);
          return acc;
        }, {});
        setAssignments(assigns);
        console.log('Fetched assignments:', assigns);
      } catch (err) {
        setError(err.message);
        console.error(err);
      }
    };
    fetchUsers();
    fetchSites();
    fetchAssignments();

    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      });
    });
  }, []);

  const addUser = async () => {
    try {
      const res = await fetch('/.netlify/functions/add-user', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, password: newPassword, isAdmin }),
      });
      if (!res.ok) throw new Error('Add user failed');
      const data = await res.json();
      setUsers([...users, data]);
      setNewEmail('');
      setNewPassword('');
      setIsAdmin(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch('/.netlify/functions/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  const addSite = async () => {
    try {
      const res = await fetch('/.netlify/functions/add-site', {
        method: 'POST',
        body: JSON.stringify({ name: newSiteName }),
      });
      if (!res.ok) throw new Error('Add site failed');
      const data = await res.json();
      setSites([...sites, data]);
      setNewSiteName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const assignSites = async (userId, siteIds) => {
    try {
      const res = await fetch('/.netlify/functions/assign-sites', {
        method: 'POST',
        body: JSON.stringify({ userId, siteIds }),
      });
      if (!res.ok) throw new Error('Assign sites failed');
      setAssignments(prev => ({ ...prev, [userId]: siteIds }));
      setTempAssigns(prev => ({ ...prev, [userId]: undefined }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSiteChange = (userId, e) => {
    const siteIds = Array.from(e.target.selectedOptions, o => o.value);
    setTempAssigns(prev => ({ ...prev, [userId]: siteIds }));
  };

  const tileUrl = mapType === 'map' 
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a202c', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Admin Dashboard</h1>
      {error && <div style={{ backgroundColor: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add User</h2>
        <input type="email" placeholder="User Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
        <input type="password" placeholder="User Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', color: '#4a5568' }}>
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} style={{ marginRight: '0.5rem' }} />
          Admin?
        </label>
        <button onClick={addUser} style={{ width: '100%', backgroundColor: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Add User</button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Users</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(user => (
            <li key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#2d3748', fontWeight: '500' }}>{user.email} - {user.user_metadata?.role || 'Employee'}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <select
                  multiple
                  value={tempAssigns[user.id] || assignments[user.id] || []}
                  onChange={e => handleSiteChange(user.id, e)}
                  style={{ width: '200px', height: '100px', marginRight: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem', backgroundColor: '#fff', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}
                >
                  {sites.length === 0 ? (
                    <option disabled>No sites available - add one below</option>
                  ) : (
                    sites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))
                  )}
                </select>
                <button onClick={() => assignSites(user.id, tempAssigns[user.id] || assignments[user.id] || [])} style={{ backgroundColor: '#4299e1', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginRight: '0.5rem', fontWeight: '600' }}>Save Sites</button>
                <button onClick={() => deleteUser(user.id)} style={{ backgroundColor: '#f56565', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Site</h2>
        <input placeholder="Site Name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
        <button onClick={addSite} style={{ width: '100%', backgroundColor: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Add Site</button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Sites Map</h2>
        <div style={{ marginBottom: '0.75rem' }}>
          <button onClick={() => setMapType('map')} style={{ backgroundColor: mapType === 'map' ? '#a0aec0' : 'white', color: mapType === 'map' ? 'white' : '#333', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', marginRight: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>Map</button>
          <button onClick={() => setMapType('satellite')} style={{ backgroundColor: mapType === 'satellite' ? '#a0aec0' : 'white', color: mapType === 'satellite' ? 'white' : '#333', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: '600' }}>Satellite</button>
        </div>
        <MapContainer center={[45.0, -75.0]} zoom={4} style={{ height: '300px', width: '100%', borderRadius: '0.375rem' }}>
          <TileLayer url={tileUrl} />
        </MapContainer>
      </div>
      <button onClick={() => { /* Logout: const supabase = createClient(supabaseUrl, supabaseAnonKey); supabase.auth.signOut(); window.location.href = '/'; */ }} style={{ backgroundColor: '#f56565', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem', fontWeight: '600' }}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
