// src/components/EmployeeDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [assignment, setAssignment] = useState(null); // Store for site_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAndSite = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        const { data: assignData, error: assignError } = await supabase
          .from('employee_sites')
          .select('site_id')
          .eq('employee_id', user.id)
          .single();
        if (assignError && assignError.code !== 'PGRST116') throw assignError;

        setAssignment(assignData);

        if (assignData) {
          const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('name')
            .eq('id', assignData.site_id)
            .single();
          if (siteError) throw siteError;
          setSite(siteData?.name);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message || 'Error loading dashboard');
        setLoading(false);
      }
    };
    fetchUserAndSite();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    window.location.href = '/';
  };

  const handleClockIn = async () => {
    if (!assignment) return alert('No site assigned');
    const { error } = await supabase.from('clock_ins').insert({
      user_id: user.id,
      time_in: new Date().toISOString(),
      site_id: assignment.site_id,
    });
    if (error) alert(`Error clocking in: ${error.message}`);
    else alert('Clocked in!');
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Employee Dashboard</h1>
      <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      <p>Welcome, {user?.user_metadata?.full_name || ''}</p>
      {site ? (
        <div>
          <p>Assigned to: {site}</p>
          <button onClick={handleClockIn} className="bg-blue-500 text-white px-4 py-2 rounded">Clock In</button>
        </div>
      ) : (
        <p className="text-orange-500">Not assigned to any site</p>
      )}
    </div>
  );
}
