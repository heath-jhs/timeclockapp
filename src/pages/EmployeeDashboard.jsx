import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';

export default function EmployeeDashboard() {
  const [schedule, setSchedule] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get today's schedule
    const today = new Date().toISOString().split('T')[0];
    const { data: sched } = await supabase
      .from('schedules')
      .select('*, sites(*)')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    setSchedule(sched);

    // Get recent logs
    const { data: logData } = await supabase
      .from('time_logs')
      .select('*, sites(name)')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(10);

    setLogs(logData || []);
    setLoading(false);
  };

  const getTimeString = (log) => {
    return format(new Date(log.timestamp), 'h:mm a');
  };

  const getDateHeader = (date) => {
    if (isToday(new Date(date))) return 'Today';
    if (isTomorrow(new Date(date))) return 'Tomorrow';
    return format(new Date(date), 'MMM d');
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4 shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">TimeClock</h1>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm underline"
          >
            Settings
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Today's Schedule */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Today's Job</h2>
          {schedule ? (
            <div className="space-y-2">
              <p className="font-medium">{schedule.sites.name}</p>
              <p className="text-sm text-gray-600">{schedule.sites.address}</p>
              <p className="text-sm">
                {schedule.start_time} – {schedule.end_time}
                {schedule.is_recurring && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Recurring</span>}
              </p>
              <a
                href={`https://maps.google.com/?q=${schedule.sites.lat},${schedule.sites.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline text-sm"
              >
                Open in Maps
              </a>
            </div>
          ) : (
            <p className="text-gray-500">No job scheduled today</p>
          )}
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          {logs.length > 0 ? (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex justify-between text-sm">
                  <span>
                    {log.type === 'in' ? '🟢 Clocked IN' : '🔴 Clocked OUT'} at{' '}
                    <strong>{log.sites?.name || 'Unknown Site'}</strong>
                  </span>
                  <span className="text-gray-500">{getTimeString(log)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No activity yet</p>
          )}
        </section>
      </main>
    </div>
  );
}
