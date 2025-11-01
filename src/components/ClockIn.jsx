// src/components/ClockIn.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';

export default function ClockIn({ user }) {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastClock, setLastClock] = useState(null);

  useEffect(() => {
    // Load sites
    supabase.from('sites').select('id, name').then(({ data }) => setSites(data || []));

    // Load last clock-in for this user
    supabase
      .from('in_logs')
      .select('time_in')
      .eq('user_id', user.id)
      .order('time_in', { ascending: false })
      .limit(1)
      .then(({ data }) => data?.[0] && setLastClock(data[0].time_in));
  }, [user.id]);

  const handleClockIn = async () => {
    if (!selectedSite) return alert('Please select a site');
    setLoading(true);
    const { error } = await supabase
      .from('in_logs')
      .insert({ user_id: user.id, site_id: selectedSite, time_in: new Date() });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setLastClock(new Date().toISOString());
      alert('Clocked in successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Clock In</h1>

      {lastClock && (
        <p className="text-sm text-gray-600 mb-4">
          Last clock-in: {format(new Date(lastClock), 'PPP p')}
        </p>
      )}

      <select
        value={selectedSite}
        onChange={(e) => setSelectedSite(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded mb-4 text-left"
      >
        <option value="">Select a Site</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>

      <button
        onClick={handleClockIn}
        disabled={loading || !selectedSite}
        className="w-full bg-primary text-white py-4 rounded text-xl font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Clocking In...' : 'CLOCK IN'}
      </button>
    </div>
  );
}
