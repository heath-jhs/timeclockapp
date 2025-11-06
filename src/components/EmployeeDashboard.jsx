import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import jshLogo from '../assets/jsh-logo.png'; // From assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
const EmployeeDashboard = ({ logout, userId }) => {
  const [assignedSites, setAssignedSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [history, setHistory] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [effectiveUserId, setEffectiveUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        let targetId = userId;
        if (!targetId) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          targetId = user.id;
        } else {
          setIsPreview(true);
        }
        setEffectiveUserId(targetId);
        // Profile
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', targetId).single();
        setProfile(prof);
        // Assigned sites
        const { data: assignments } = await supabase
          .from('employee_sites')
          .select('site_id')
          .eq('employee_id', targetId);
        const siteIds = assignments.map(a => a.site_id);
        const { data: sites } = await supabase
          .from('sites')
          .select('*')
          .in('id', siteIds);
        setAssignedSites(sites);
        // Schedule (from employee_sites with dates)
        const { data: sched } = await supabase
          .from('employee_sites')
          .select('*, site:site_id (name)')
          .eq('employee_id', targetId)
          .order('start_date');
        setSchedule(sched);
        // History
        const { data: hist } = await supabase
          .from('time_entries')
          .select('*, site:site_id (name)')
          .eq('employee_id', targetId)
          .order('clock_in_time', { ascending: false });
        setHistory(hist);
        // Current entry
        const { data: entry } = await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', targetId)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1);
        setCurrentEntry(entry[0] || null);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Data fetch error:', err); // Added logging for troubleshooting
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndData();
  }, [userId]);
  const getLocation = () => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const deltaP = (lat2 - lat1) * Math.PI / 180;
    const deltaL = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const clockIn = async () => {
    if (!selectedSite) {
      setError('Select a site first');
      return;
    }
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      const site = assignedSites.find(s => s.id === selectedSite);
      const dist = haversineDistance(latitude, longitude, site.lat, site.lon);
      if (dist > 100) throw new Error('Too far from site - must be within 100m');
      const { data, error } = await supabase.from('time_entries').insert({
        employee_id: effectiveUserId,
        site_id: selectedSite,
        clock_in_time: new Date().toISOString(),
        clock_in_lat: latitude,
        clock_in_lon: longitude,
      }).select();
      if (error) throw error;
      setCurrentEntry(data[0]);
      setSelectedSite('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };
  const clockOut = async () => {
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      const site = assignedSites.find(s => s.id === currentEntry.site_id);
      const dist = haversineDistance(latitude, longitude, site.lat, site.lon);
      if (dist > 100) throw new Error('Too far from site - must be within 100m');
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out_time: new Date().toISOString(), clock_out_lat: latitude, clock_out_lon: longitude })
        .eq('id', currentEntry.id);
      if (error) throw error;
      setCurrentEntry(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };
  const calculateDuration = (entry) => {
    if (!entry.clock_out_time) return 'Ongoing';
    const start = new Date(entry.clock_in_time);
    const end = new Date(entry.clock_out_time);
    const diff = (end - start) / (1000 * 60 * 60);
    return diff.toFixed(2) + ' hours';
  };
  const paginatedHistory = history.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <img src={jshLogo} alt="JSH Logo" style={{ maxHeight: '60px' }} />
      </div>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Employee Dashboard {isPreview ? '(Preview)' : ''}</h1>
      {error && <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{error}</div>}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Profile</h2>
        <p>Name: {profile?.full_name || 'Not set'}</p>
        <p>Role: {profile?.role || 'Employee'}</p>
        <p>Daily Hours: {profile?.work_hours || 8}</p>
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Clock In/Out</h2>
        {isPreview ? (
          <p>Clock actions disabled in preview mode.</p>
        ) : currentEntry ? (
          <div>
            <p>Clocked in at {assignedSites.find(s => s.id === currentEntry.site_id)?.name} since {new Date(currentEntry.clock_in_time).toLocaleString()}</p>
            <button onClick={clockOut} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>Clock Out</button>
          </div>
        ) : (
          <div>
            <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
              <option value="">Select Site</option>
              {assignedSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <button onClick={clockIn} style={{ background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Clock In</button>
          </div>
        )}
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem', opacity: isPreview ? 0.7 : 1, pointerEvents: isPreview ? 'none' : 'auto' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Schedule {isPreview && '(Read-Only)'}</h2>
        <ul>
          {schedule.map(s => (
            <li key={s.id}>
              {s.site.name}: {s.start_date ? new Date(s.start_date).toLocaleString() : 'N/A'} - {s.end_date ? new Date(s.end_date).toLocaleString() : 'N/A'}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem', opacity: isPreview ? 0.7 : 1, pointerEvents: isPreview ? 'none' : 'auto' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>History {isPreview && '(Read-Only)'}</h2>
        <ul>
          {paginatedHistory.map(entry => (
            <li key={entry.id}>
              Site: {entry.site.name}<br />
              In: {new Date(entry.clock_in_time).toLocaleString()}<br />
              Out: {entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleString() : 'Ongoing'}<br />
              Duration: {calculateDuration(entry)}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button disabled={historyPage === 1} onClick={() => setHistoryPage(prev => prev - 1)} style={{ marginRight: '1rem' }}>Prev</button>
          <button disabled={historyPage * itemsPerPage >= history.length} onClick={() => setHistoryPage(prev => prev + 1)}>Next</button>
        </div>
      </div>
      <div style={{ height: '400px', marginBottom: '1.5rem' }}>
        <MapContainer center={[37.0902, -95.7129]} zoom={4} style={{ height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {assignedSites.map(site => site.lat && site.lon && (
            <Marker key={site.id} position={[site.lat, site.lon]}>
              <Popup>{site.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <button onClick={logout} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Logout</button>
    </div>
  );
};
export default EmployeeDashboard;
