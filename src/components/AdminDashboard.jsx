import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [assignments, setAssignments] = useState({}); // {userId: [siteIds]}
  const [tempAssigns, setTempAssigns] = useState({});
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [error, setError] = useState(null);
  const [mapType, setMapType] = useState('map'); // For Map/Satellite tabs

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/.netlify/functions/list-users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    };
    const fetchSites = async () => {
      const res = await fetch('/.netlify/functions/list-sites');
      if (res.ok) {
        setSites(await res.json());
      }
    };
    const fetchAssignments = async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.from('employee_sites').select('*');
      if (error) console.error(error);
      else {
        const assigns = data.reduce((acc, { employee_id, site_id }) => {
          if (!acc[employee_id]) acc[employee_id] = [];
          acc[employee_id].push(site_id);
          return acc;
        }, {});
        setAssignments(assigns);
      }
    };
    fetchUsers();
    fetchSites();
    fetchAssignments();

    // Fix Leaflet icon paths if needed (common issue)
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
    const res = await fetch('/.netlify/functions/add-user', {
      method: 'POST',
      body: JSON.stringify({ email: newEmail, password: newPassword, isAdmin }),
    });
    if (res.ok) {
      setUsers([...users, await res.json()]);
      setNewEmail('');
      setNewPassword('');
      setIsAdmin(false);
    } else {
      setError('Failed to add user');
    }
  };

  const deleteUser = async (userId) => {
    const res = await fetch('/.netlify/functions/delete-user', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== userId));
    } else {
      setError(`Failed to delete user: ${await res.text()}`);
    }
  };

  const addSite = async () => {
    const res = await fetch('/.netlify/functions/add-site', {
      method: 'POST',
      body: JSON.stringify({ name: newSiteName }),
    });
    if (res.ok) {
      setSites([...sites, await res.json()]);
      setNewSiteName('');
    } else {
      setError('Failed to add site');
    }
  };

  const assignSites = async (userId, siteIds) => {
    const res = await fetch('/.netlify/functions/assign-sites', {
      method: 'POST',
      body: JSON.stringify({ userId, siteIds }),
    });
    if (res.ok) {
      setAssignments(prev => ({ ...prev, [userId]: siteIds }));
      setTempAssigns(prev => ({ ...prev, [userId]: undefined })); // Clear temp
    } else {
      setError('Failed to assign sites');
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#333' }}>Admin Dashboard</h1>
      {error && <p style={{ color: 'red', background: '#ffebee', padding: '10px', borderRadius: '5px' }}>{error}</p>}
      <h2>Add User</h2>
      <input
        type="email"
        placeholder="User Email"
        value={newEmail}
        onChange={e => setNewEmail(e.target.value)}
        style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}
      />
      <input
        type="password"
        placeholder="User Password"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}
      />
      <label style={{ display: 'block', margin: '10px 0' }}>
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={e => setIsAdmin(e.target.checked)}
        />
        Admin?
      </label>
      <button onClick={addUser} style={{ background: 'green', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Add User</button>

      <h2>Users</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li key={user.id} style={{ display: 'flex', alignItems: 'center', margin: '10px 0', padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
            <span style={{ flex: 1 }}>{user.email} - {user.user_metadata?.role || 'Employee'}</span>
            <select
              multiple
              value={tempAssigns[user.id] || assignments[user.id] || []}
              onChange={e => handleSiteChange(user.id, e)}
              style={{ marginRight: '10px', padding: '5px' }}
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <button onClick={() => assignSites(user.id, tempAssigns[user.id] || assignments[user.id] || [])} style={{ background: 'blue', color: 'white', padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', marginRight: '10px' }}>
              Save Sites
            </button>
            <button onClick={() => deleteUser(user.id)} style={{ background: 'red', color: 'white', padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <h2>Add Site</h2>
      <input
        placeholder="Site Name"
        value={newSiteName}
        onChange={e => setNewSiteName(e.target.value)}
        style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}
      />
      <button onClick={addSite} style={{ background: 'green', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Add Site</button>

      <h2>Sites Map</h2>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => setMapType('map')} style={{ background: mapType === 'map' ? 'gray' : 'white', padding: '5px 10px', borderRadius: '5px', marginRight: '5px' }}>Map</button>
        <button onClick={() => setMapType('satellite')} style={{ background: mapType === 'satellite' ? 'gray' : 'white', padding: '5px 10px', borderRadius: '5px' }}>Satellite</button>
      </div>
      <MapContainer center={[45.0, -75.0]} zoom={4} style={{ height: '300px', width: '100%', borderRadius: '5px' }}>
        <TileLayer url={tileUrl} />
        {/* Add Markers for sites if lat/lng added later */}
      </MapContainer>
      <button onClick={() => {/* Add logout logic, e.g., supabase.auth.signOut() */}} style={{ background: 'red', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', marginTop: '20px' }}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
