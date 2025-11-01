// src/components/ClockIn.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { format, differenceInMinutes } from 'date-fns';

export default function ClockIn({ user }) {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastIn, setLastIn] = useState(null);
  const [lastOut, setLastOut] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);

  useEffect(() => {
    // Get assigned site
    supabase
      .from('employee_sites')
      .select('site_id, sites!site_id(name)')
      .eq('employee_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSites([{ id: data.site_id, name: data.sites.name }]);
          setSelectedSite(data.site_id);
        }
      });

    // Load latest log
    supabase
      .from('clock_ins')
      .select('time_in, time_out')
      .eq('user_id', user.id)
      .order('time_in', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const log = data[0];
          setLastIn(log.time_in);
          setLastOut(log.time_out);
          setIsClockedIn(!log.time_out);
        }
      });
  }, [user.id]);

  const handleClockIn = async () => {
    if (!selectedSite) return alert('No site assigned');
    setLoading(true);
    const { error } = await supabase
      .from('in_logs')
      .insert({ user_id: user.id, site_id: selectedSite, time_in: new Date() });

    if (error) alert('Error: ' + error.message);
    else {
      setLastIn(new Date().toISOString());
      setIsClockedIn(true);
      alert('Clocked in!');
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('in_logs')
      .update({ time_out: new Date() })
      .eq('user_id', user.id)
      .is('time_out', null);

    if (error) alert('Error: ' + error.message);
    else {
      setLastOut(new Date().toISOString());
      setIsClockedIn(false);
      alert('Clocked out!');
    }
    setLoading(false);
  };

  const totalMinutes = lastIn && lastOut ? differenceInMinutes(new Date(lastOut), new Date(lastIn)) : 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Time Clock</h1>

      {sites.length > 0 ? (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-700">Assigned Site:</p>
          <p className="font-medium">{sites[0].name}</p>
        </div>
      ) : (
        <p className="text-red-600 mb-4">No site assigned. Contact admin.</p>
      )}

      {lastIn && (
        <p className="text-sm text-gray-600 mb-2">
          In: {format(new Date(lastIn), 'PPP p')}
        </p>
      )}
      {lastOut && (
        <p className="text-sm text-gray-600 mb-4">
          Out: {format(new Date(lastOut), 'PPP p')} • Total: {hours}h {minutes}m
        </p>
      )}

      <button
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        disabled={loading || sites.length === 0}
        className={`w-full py-4 rounded text-xl font-semibold transition-all
          ${isClockedIn 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-primary hover:bg-blue-800 text-white'
          } disabled:opacity-50`}
      >
        {loading ? 'Processing...' : isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
      </button>
    </div>
  );
}
