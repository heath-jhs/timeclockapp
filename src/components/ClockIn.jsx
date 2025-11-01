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
    // Get employee's assigned site
    supabase
      .from('employee_sites')
      .select('site_id, sites!site_id(name)')
      .eq('employee_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && data.site_id) {
          setSites([{ id: data.site_id, name: data.sites.name }]);
          setSelectedSite(data.site_id);
        } else {
          setSites([]);
        }
      });

    // Load last clock-in
    supabase
      .from('in_logs')
      .select('time_in')
      .eq('user_id', user.id)
      .order('time_in', { ascending: false })
      .limit(1)
      .then(({ data }) => data?.[0] && setLastClock(data[0].time_in));
  }, [user.id]);

  const handleClockIn = async () => {
    if (!selectedSite) return alert('No site assigned');
    setLoading(true);
    const { error } = await supabase
      .from('in_logs')
      .insert({ user_id: user.id, site_id: selectedSite, time_in: new Date() });

    if (error) alert('Error: ' + error.message);
    else {
      setLastClock(new Date().toISOString());
      alert('Clocked in!');
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

      {sites.length > 0 ? (
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">Assigned Site:</p>
          <div className="p-3 bg-gray-100 rounded font-medium">
            {sites[0].name}
          </div>
        </div>
      ) : (
        <p className="text-red-600 mb-4">No site assigned. Contact admin.</p>
      )}

      <button
        onClick={handleClockIn}
        disabled={loading || sites.length === 0}
        className="w-full bg-primary text-white py-4 rounded text-xl font-semibold hover:bg-blue-800 disabled:opacity-50"
      >
        {loading ? 'Clocking In...' : 'CLOCK IN'}
      </button>
    </div>
  );
}
