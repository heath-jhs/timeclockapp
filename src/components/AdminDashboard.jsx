import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const AdminDashboard = ({ logout }) => {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeIsAdmin, setNewEmployeeIsAdmin] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSites, setSelectedSites] = useState([]);
  const [error, setError] = useState(null);

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    fetchEmployees();
    fetchSites();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase.from('sites').select('*');
      if (error) throw error;
      setSites(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const addEmployee = async () => {
    try {
      const response = await fetch('/.netlify/functions/add-user', {
        method: 'POST',
        body: JSON.stringify({ email: newEmployeeEmail, isAdmin: newEmployeeIsAdmin }),
      });
      if (!response.ok) throw new Error('Failed to add user');
      fetchEmployees();
      setNewEmployeeEmail('');
      setNewEmployeeIsAdmin(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSite = async () => {
    if (!newSiteName || !newSiteAddress) {
      setError('Please provide both site name and address');
      return;
    }
    try {
      const response = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        body: JSON.stringify({ address: newSiteAddress }),
      });
      if (!response.ok) throw new Error('Geocoding failed');
      const { lat, lon } = await response.json();
      const { error } = await supabase.from('sites').insert({ name: newSiteName, lat, lon });
      if (error) throw error;
      fetchSites();
      setNewSiteName('');
      setNewSiteAddress('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const assignSites = async () => {
    try {
      const inserts = selectedSites.map(siteId => ({ employee_id: selectedEmployee, site_id: siteId }));
      const { error } = await supabase.from('employee_sites').insert(inserts);
      if (error) throw error;
      setSelectedEmployee('');
      setSelectedSites([]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa' }}>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
      {error && <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{error}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Employee</h2>
          <input type="email" placeholder="Email" value={newEmployeeEmail} onChange={e => setNewEmployeeEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <input type="checkbox" checked={newEmployeeIsAdmin} onChange={e => setNewEmployeeIsAdmin(e.target.checked)} style={{ marginRight: '0.5rem' }} /> Admin
          </label>
          <button onClick={addEmployee} style={{ width: '100%', background: '#4299e1', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add Employee</button>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Employees</h2>
          <ul style={{ listStyleType: 'none' }}>
            {employees.map(emp => (
              <li key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                {emp.username} ({emp.role})
                <button onClick={() => deleteEmployee(emp.id)} style={{ background: '#f56565', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Site</h2>
          <input type="text" placeholder="Site Name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
          <input type="text" placeholder="American Address (e.g., 123 Main St, City, State ZIP)" value={newSiteAddress} onChange={e => setNewSiteAddress(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
          <button onClick={addSite} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add Site</button>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Assign Sites to Employee</h2>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
            <option value="">Select Employee</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username}</option>)}
          </select>
          <div style={{ marginBottom: '1rem' }}>
            {sites.map(site => (
              <label key={site.id} style={{ display: 'block', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={selectedSites.includes(site.id)} onChange={() => {
                  setSelectedSites(prev => prev.includes(site.id) ? prev.filter(s => s !== site.id) : [...prev, site.id]);
                }} style={{ marginRight: '0.5rem' }} /> {site.name}
              </label>
            ))}
          </div>
          <button onClick={assignSites} style={{ width: '100%', background: '#4299e1', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Assign Sites</button>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Sites Map</h2>
        <MapContainer center={[37.0902, -95.7129]} zoom={4} style={{ height: '400px', width: '100%' }}>  {/* Default to US center */}
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {sites.map(site => site.lat && site.lon && (
            <Marker key={site.id} position={[site.lat, site.lon]}>
              <Popup>{site.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <button onClick={logout} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
