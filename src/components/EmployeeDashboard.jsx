import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const EmployeeDashboard = ({ logout }) => {
  const [assignedSites, setAssignedSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [allowTracking, setAllowTracking] = useState(true);
  const [trackingStart, setTrackingStart] = useState('09:00');
  const [trackingEnd, setTrackingEnd] = useState('17:00');
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUserId(user.id);

        // Fetch profile with tracking prefs
        const { data: prof, error: profError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profError) throw profError;
        setProfile(prof);
        setAllowTracking(prof.allow_tracking);
        setTrackingStart(prof.tracking_start || '09:00');
        setTrackingEnd(prof.tracking_end || '17:00');

        // Fetch assigned sites
        const { data: assignments, error: assignError } = await supabase
          .from('employee_sites')
          .select('site_id')
          .eq('employee_id', user.id);
        if (assignError) throw assignError;
        const siteIds = assignments.map(a => a.site_id);
        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('*')
          .in('id', siteIds);
        if (sitesError) throw sitesError;
        setAssignedSites(sites);

        // Check for open entry (clock_out_time is null)
        const { data: entry, error: entryError } = await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', user.id)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1);
        if (entryError) throw entryError;
        setCurrentEntry(entry[0] || null);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserAndData();
  }, []);

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
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...trackingStart.split(':').map(Number));
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...trackingEnd.split(':').map(Number));
      const useGeo = allowTracking && now >= todayStart && now <= todayEnd;

      let latitude = null;
      let longitude = null;
      let locationNote = 'Manual - Tracking Disabled or Outside Hours';

      if (useGeo) {
        try {
          const position = await getLocation();
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          const site = assignedSites.find(s => s.id === selectedSite);
          const dist = haversineDistance(latitude, longitude, site.lat, site.lon);
          if (dist > 100) throw new Error('Too far from site - must be within 100m');
          locationNote = null; // Geo successful, no note
        } catch (geoErr) {
          // Fallback to manual on geo fail/denied
          locationNote = 'Manual - Location Access Denied or Failed';
        }
      }

      const { data: newEntry, error } = await supabase.from('time_entries').insert({
        employee_id: userId,
        site_id: selectedSite,
        clock_in_time: new Date().toISOString(),
        clock_in_lat: latitude,
        clock_in_lon: longitude,
        location_note: locationNote,
      }).select().single();
      if (error) throw error;
      setCurrentEntry({ ...newEntry, site_id: selectedSite, clock_in_time: new Date().toISOString() });
      setSelectedSite('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const clockOut = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...trackingStart.split(':').map(Number));
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...trackingEnd.split(':').map(Number));
      const useGeo = allowTracking && now >= todayStart && now <= todayEnd;

      let latitude = null;
      let longitude = null;
      let locationNote = 'Manual - Tracking Disabled or Outside Hours';

      if (useGeo) {
        try {
          const position = await getLocation();
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          const site = assignedSites.find(s => s.id === currentEntry.site_id);
          const dist = haversineDistance(latitude, longitude, site.lat, site.lon);
          if (dist > 100) throw new Error('Too far from site - must be within 100m');
          locationNote = null;
        } catch (geoErr) {
          locationNote = 'Manual - Location Access Denied or Failed';
        }
      }

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out_time: new Date().toISOString(),
          clock_out_lat: latitude,
          clock_out_lon: longitude,
          location_note: locationNote ? (currentEntry.location_note ? currentEntry.location_note + '; ' + locationNote : locationNote) : null,
        })
        .eq('id', currentEntry.id);
      if (error) throw error;
      setCurrentEntry(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTrackingPrefs = async () => {
    try {
      const { error } = await supabase.from('profiles').update({
        allow_tracking: allowTracking,
        tracking_start: trackingStart,
        tracking_end: trackingEnd,
      }).eq('id', userId);
      if (error) throw error;
      setError(null);
      // Refresh profile
      const { data: updatedProf } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(updatedProf);
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa' }}>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Employee Dashboard</h1>
      {error && <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{error}</div>}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Clock In/Out</h2>
        {currentEntry ? (
          <div>
            <p style={{ marginBottom: '1rem' }}>Clocked in at site ID {currentEntry.site_id} since {new Date(currentEntry.clock_in_time).toLocaleString()}</p>
            <button onClick={clockOut} style={{ width: '100%', background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Clock Out</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
              <option value="">Select Site</option>
              {assignedSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <button onClick={clockIn} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Clock In</button>
          </div>
        )}
      </div>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Tracking Settings</h2>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <input type="checkbox" checked={allowTracking} onChange={e => setAllowTracking(e.target.checked)} />
          Allow Location Tracking
        </label>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tracking Start Time:</label>
        <input type="time" value={trackingStart} onChange={e => setTrackingStart(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tracking End Time:</label>
        <input type="time" value={trackingEnd} onChange={e => setTrackingEnd(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <button onClick={saveTrackingPrefs} style={{ width: '100%', background: '#4299e1', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Save Settings</button>
      </div>
      <button onClick={logout} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};

export default EmployeeDashboard;
