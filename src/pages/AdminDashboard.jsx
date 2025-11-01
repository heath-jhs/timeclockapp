// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient.js';   // ← CORRECTED PATH + .js extension

export default function AdminDashboard() {
  const [inLogs, setInLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInLogs() {
      try {
        const { data, error } = await supabase
          .from('in_logs')
          .select(`
            *,
            profiles(full_name),
            sites(name)
          `)
          .order('time_in', { ascending: false });

        if (error) throw error;
        setInLogs(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInLogs();
  }, []);

  if (loading) return <p className="p-4">Loading…</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard – Clock-In Logs</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left border-b">Employee</th>
              <th className="px-4 py-2 text-left border-b">Site</th>
              <th className="px-4 py-2 text-left border-b">Time In</th>
            </tr>
          </thead>
          <tbody>
            {inLogs.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-2 text-center text-gray-500">
                  No logs yet.
                </td>
              </tr>
            ) : (
              inLogs.map((inLog) => (
                <tr key={inLog.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    {inLog.profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {inLog.sites?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {format(new Date(inLog.time_in), 'PPpp')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
