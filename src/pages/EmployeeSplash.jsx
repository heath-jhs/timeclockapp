import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeSplash() {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const [todayAssignments, setTodayAssignments] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [clockStatus, setClockStatus] = useState({}); // { assignmentId: { in: ts, out: ts } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load assignments and clock status
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/login');
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        // Load today's assignments
        const { data: todayData, error: todayError } = await supabase
          .from('employee_sites')
          .select(`
            id,
            start_date,
            end_date,
            start_time,
            end_time,
            site_id,
            sites!inner (
              name,
              address,
              lat,
              lon
            )
          `)
          .eq('employee_id', user.id)
          .lte('start_date', today)
          .gte('end_date', today);

        if (todayError) throw todayError;

        // Load upcoming assignments (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const { data: upcomingData, error: upcomingError } = await supabase
          .from('employee_sites')
          .select(`
            id,
            start_date,
            end_date,
            start_time,
            end_time,
            site_id,
            sites!inner (
              name,
              address
            )
          `)
          .eq('employee_id', user.id)
          .gt('end_date', today)
          .lte('end_date', nextWeekStr)
          .order('start_date', { ascending: true });

        if (upcomingError) throw upcomingError;

        // Load clock events for today
        const { data: clockData, error: clockError } = await supabase
          .from('clock_events')
          .select('assignment_id, event_type, timestamp')
          .eq('employee_id', user.id)
          .gte('timestamp', `${today}T00:00:00Z`)
          .lte('timestamp', `${today}T23:59:59Z`);

        if (clockError) throw clockError;

        const status = {};
        clockData.forEach(event => {
          if (!status[event.assignment_id]) status[event.assignment_id] = {};
          status[event.assignment_id][event.event_type] = event.timestamp;
        });

        setTodayAssignments(todayData || []);
        setUpcomingAssignments(upcomingData || []);
        setClockStatus(status);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, navigate]);

  const handleClock = async (assignmentId, siteId, type) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current position for geofence check (implement as needed)
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      const { latitude: lat, longitude: lon } = position.coords;

      // Insert clock event
      const { error } = await supabase.from('clock_events').insert({
        employee_id: user.id,
        assignment_id,
        site_id: siteId,
        event_type: type,
        timestamp: new Date().toISOString(),
        lat,
        lon
      });

      if (error) throw error;

      // Update local status
      setClockStatus(prev => ({
        ...prev,
        [assignmentId]: { ...prev[assignmentId], [type]: new Date().toISOString() }
      }));
    } catch (err) {
      alert(`Clock ${type} failed: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-5 max-w-md mx-auto space-y-10">
      {/* Today's Assignments */}
      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Today's Assignments</h2>
        {todayAssignments.length === 0 ? (
          <p className="text-gray-500">No assignments today</p>
        ) : (
          todayAssignments.map(ass => {
            const site = ass.sites;
            const status = clockStatus[ass.id] || {};

            return (
              <div
                key={ass.id}
                className="bg-white rounded-lg shadow p-4 mb-4"
              >
                <h3 className="text-lg font-medium mb-1">{site.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{site.address}</p>
                <p className="text-sm mb-3">
                  {ass.start_time} – {ass.end_time}
                </p>
                <a
                  href={`https://maps.google.com/?q=${site.lat},${site.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm block mb-3"
                >
                  Get Directions
                </a>
                <div className="flex flex-wrap gap-2">
                  {!status.in && (
                    <button
                      onClick={() => handleClock(ass.id, ass.site_id, 'in')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                    >
                      Clock In
                    </button>
                  )}
                  {status.in && (
                    <span className="text-green-600 font-medium text-sm">
                      ✓ Clocked In: {new Date(status.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {status.in && !status.out && (
                    <button
                      onClick={() => handleClock(ass.id, ass.site_id, 'out')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                      Clock Out
                    </button>
                  )}
                  {status.out && (
                    <span className="text-red-600 font-medium text-sm">
                      ✓ Clocked Out: {new Date(status.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Upcoming This Week</h2>
          {upcomingAssignments.map(ass => {
            const site = ass.sites;
            const date = new Date(ass.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div
                key={ass.id}
                className="border-l-4 border-blue-500 pl-4 bg-blue-50 rounded-r-lg mb-2 p-3"
              >
                <p className="font-medium mb-1">
                  {date} • {ass.start_time} – {ass.end_time}
                </p>
                <p className="text-blue-800">
                  {site.name} – {site.address}
                </p>
              </div>
            );
          })}
        </section>
      )}

      {/* Logout */}
      <footer className="text-center">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700"
        >
          Log Out
        </button>
      </footer>
    </div>
  );
}
