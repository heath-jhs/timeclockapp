// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '../supabaseClient';
import AssignSites from '../components/AssignSites';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('clock_ins')
        .select(`
          id,
          time_in,
          time_out,
          user_id,
          site_id,
          profiles!user_id(full_name, avatar_url),
          sites!site_id(name)
        `)
        .order('time_in', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const exportCSV = () => {
    const headers = ['Employee', 'Site', 'Time In', 'Time Out', 'Duration'];
    const rows = logs.map(log => {
      const duration = log.time_out 
        ? `${Math.floor(differenceInMinutes(new Date(log.time_out), new Date(log.time_in)) / 60)}h ${differenceInMinutes(new Date(log.time_out), new Date(log.time_in)) % 60}m`
        : '—';
      return [
        log.profiles?.full_name || 'Unknown',
        log.sites?.name || 'Unknown',
        format(new Date(log.time_in), 'PPpp'),
        log.time_out ? format(new Date(log.time_out), 'PPpp') : '—',
        duration
      ];
    });
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clockin-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) return <p className="p-6 text-center">Loading logs...</p>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Clock-In Logs</h1>
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
        >
          📥 Export CSV
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No clock-in logs yet.</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Site
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Time Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const duration = log.time_out 
                  ? `${Math.floor(differenceInMinutes(new Date(log.time_out), new Date(log.time_in)) / 60)}h ${differenceInMinutes(new Date(log.time_out), new Date(log.time_in)) % 60}m`
                  : '—';
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {log.profiles?.avatar_url ? (
                          <img
                            src={log.profiles.avatar_url}
                            alt={log.profiles.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                            ?
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {log.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell text-sm text-gray-600">
                      {log.sites?.name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.time_in), 'PPpp')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {log.time_out ? format(new Date(log.time_out), 'PPpp') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {duration}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Site Assignment Section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-6">Assign Sites to Employees</h2>
        <AssignSites />
      </div>
    </div>
  );
}
