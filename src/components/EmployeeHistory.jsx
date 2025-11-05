import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { format } from 'date-fns';

export default function EmployeeHistory({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', user.id)
        .order('clockIn', { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [user.id]);

  const formatDuration = (start, end) => {
    if (!end) return '—';
    const ms = new Date(end) - new Date(start);
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clock History</h1>
        <a href="/" className="text-blue-600 hover:underline">← Back</a>
      </div>
      {records.map(r => (
        <div key={r.id} className="border p-4 rounded-lg mb-3">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{r.siteName}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(r.clockIn), 'PPP p')} – {r.clockOut ? format(new Date(r.clockOut), 'p') : 'Active'}
              </p>
            </div>
            <p className="font-medium">{formatDuration(r.clockIn, r.clockOut)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
