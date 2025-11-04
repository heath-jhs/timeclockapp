import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const EmployeeDashboard = () => {
  const [assignedSites, setAssignedSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUserId(user.id);

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

  const clockIn = async () => {
    if (!selectedSite) {
      setError('Select a site first');
      return;
    }
    try {
      const { error } = await supabase.from('time_entries').insert({
        employee_id: userId,
        site_id: selectedSite,
        clock_in_time: new Date().toISOString(),
      });
      if (error) throw error;
      setCurrentEntry({ site_id: selectedSite, clock_in_time: new Date().toISOString() });
      setSelectedSite('');
    } catch (err) {
      setError(err.message);
    }
  };

  const clockOut = async () => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out_time: new Date().toISOString() })
        .eq('id', currentEntry.id);
      if (error) throw error;
      setCurrentEntry(null);
    } catch (err) {
      setError(err.message);
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
      <button onClick={() => {}} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};

export default EmployeeDashboard;
