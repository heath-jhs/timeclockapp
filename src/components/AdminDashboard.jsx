import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
      } catch (err) {
        setError(err.message);
      }
    };
    const fetchSites = async () => {
      try {
        const res = await fetch('/.netlify/functions/list-sites');
        if (!res.ok) throw new Error(`Fetch sites failed: ${res.status}`);
        const data = await res.json();
        setSites(data);
      } catch (err) {
        setError(err.message);
      }
    };
    const fetchAssignments = async () => {
      try {
        const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await supabase.from('employee_sites').select('*');
        if (error) throw error;
        const assigns = data.reduce((acc, { employee_id, site_id }) => {
          acc[employee_id] = acc[employee_id] || [];
          acc[employee_id].push(site_id);
          return acc;
        }, {});
        setAssignments(assigns);
      } catch (err) {
        setError(err.message);
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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa' }}>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
      {error && <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add User</h2>
        <input type="email" placeholder="User Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <input type="password" placeholder="User Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} style={{ marginRight: '0.5rem' }} />
          Admin?
        </label>
        <button onClick={addUser} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add User</button>
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Users</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(user => (
            <li key={user.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ flex: '1 1 200px', marginBottom: '0.5rem' }}>{user.email} - {user.user_metadata?.role || 'Employee'}</span>
              <select
                multiple
                value={tempAssigns[user.id] || assignments[user.id] || []}
                onChange={e => handleSiteChange(user.id, e)}
                style={{ flex: '1 1 200px', height: '100px', marginBottom: '0.5rem', marginRight: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem' }}
              >
                {sites.length === 0 ? <option disabled>No sites available - add one below</option> : sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              <button onClick={() => assignSites(user.id, tempAssigns[user.id] || assignments[user.id] || [])} style={{ background: '#4299e1', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginRight: '1rem', marginBottom: '0.5rem' }}>Save Sites</button>
              <button onClick={() => deleteUser(user.id)} style={{ background: '#f56565', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Site</h2>
        <input placeholder="Site Name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <button onClick={addSite} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add Site</button>
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Sites Map</h2>
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setMapType('map')} style={{ background: mapType === 'map' ? '#a0aec0' : 'white', color: mapType === 'map' ? 'white' : '#333', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', marginRight: '0.5rem', cursor: 'pointer' }}>Map</button>
          <button onClick={() => setMapType('satellite')} style={{ background: mapType === 'satellite' ? '#a0aec0' : 'white', color: mapType === 'satellite' ? 'white' : '#333', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}>Satellite</button>
        </div>
        <MapContainer center={[45.0, -75.0]} zoom={4} style={{ height: '300px', width: '100%' }}>
          <TileLayer url={tileUrl} />
        </MapContainer>
      </div>
      <button onClick={() => {}} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
