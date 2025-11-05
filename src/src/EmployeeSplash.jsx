// src/EmployeeSplash.jsx
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Link, useNavigate } from 'react-router-dom';

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

  // Handle clock in/out
  const handleClock = async (assignmentId, siteId, type) => {
    if (!window.confirm(`Confirm CLOCK ${type.toUpperCase()} at this site?`)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('clock_events')
      .insert({
        employee_id: user.id,
        site_id: site_id,
        assignment_id: assignmentId,
        event_type: type,
      });

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    const timestamp = new Date().toISOString();
    setClockStatus(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [type]: timestamp
      }
    }));

    alert(`Clocked ${type.toUpperCase()} successfully!`);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading your assignments...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937' }}>Your Work Day</h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>Welcome back! Here's your schedule.</p>
      </header>

      <nav style={{ marginBottom: '30px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link
          to="/employee/settings"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Tracking Settings →
        </Link>
      </nav>

      {/* Today's Assignments */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#111827', marginBottom: '16px' }}>
          Today's Assignments ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})
        </h2>

        {todayAssignments.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No assignments scheduled for today.</p>
        ) : (
          todayAssignments.map(ass => {
            const status = clockStatus[ass.id] || {};
            const site = ass.sites;

            return (
              <div
                key={ass.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  backgroundColor: '#fafafa'
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111827' }}>
                  {site.name}
                </h3>
                <p style={{ margin: '4px 0', color: '#4b5563' }}>
                  📍 {site.address}
                </p>
                <p style={{ margin: '8px 0', fontWeight: '600', color: '#1f2937' }}>
                  ⏰ {ass.start_time} – {ass.end_time}
                </p>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.open(
                      `https://maps.google.com/maps?q=${encodeURIComponent(site.address)}`,
                      '_blank'
                    )}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '8px 14px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    Get Directions
                  </button>

                  {!status.in ? (
                    <button
                      onClick={() => handleClock(ass.id, ass.site_id, 'in')}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      Clock In
                    </button>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: '500' }}>
                      ✓ Clocked In: {new Date(status.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}

                  {status.in && !status.out && (
                    <button
                      onClick={() => handleClock(ass.id, ass.site_id, 'out')}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      Clock Out
                    </button>
                  )}
                  {status.out && (
                    <span style={{ color: '#dc2626', fontWeight: '500' }}>
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
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.3rem', color: '#374151', marginBottom: '12px' }}>
            Upcoming This Week
          </h2>
          {upcomingAssignments.map(ass => {
            const site = ass.sites;
            const date = new Date(ass.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div
                key={ass.id}
                style={{
                  borderLeft: '4px solid #3b82f6',
                  padding: '12px 16px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: '8px'
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: '600' }}>
                  {date} • {ass.start_time} – {ass.end_time}
                </p>
                <p style={{ margin: 0, color: '#1e40af' }}>
                  {site.name} – {site.address}
                </p>
              </div>
            );
          })}
        </section>
      )}

      {/* Logout */}
      <footer style={{ textAlign: 'center' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Log Out
        </button>
      </footer>
    </div>
  );
}
