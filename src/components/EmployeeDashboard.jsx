// src/components/EmployeeDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function EmployeeDashboard({ user }) {
  const [site, setSite] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    fetchAssignedSite();
  }, []);

  const fetchAssignedSite = async () => {
    const { data } = await supabase
      .from('employee_sites')
      .select('site_id')
      .eq('employee_id', user.id)
      .single();

    if (data) {
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('id', data.site_id)
        .single();
      setSite(siteData);
    }
  };

  const handleClockIn = async () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(
          latitude,
          longitude,
          site.latitude,
          longitude
        );

        if (distance > 100) {
          setLocationError('Too far from site');
          return;
        }

        const { error } = await supabase
          .from('clock_records')
          .insert({
            employee_id: user.id,
            clock_in: new Date().toISOString(),
            site_id: site.id
          });

        if (!error) {
          setClockedIn(true);
          setClockInTime(new Date());
        }
      },
      () => setLocationError('Failed to get location')
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.full_name}</h2>

        {site ? (
          <div className="mb-6">
            <p className="font-medium">Assigned Site:</p>
            <p>{site.name}</p>
            <p className="text-sm text-gray-600">
              {site.street_address}, {site.city}, {site.state} {site.zip_code}
            </p>
          </div>
        ) : (
          <p className="text-orange-600">Not assigned to any site</p>
        )}

        {locationError && <p className="text-red-500 mb-4">{locationError}</p>}

        <button
          onClick={handleClockIn}
          disabled={clockedIn || !site}
          className={`w-full py-3 rounded font-semibold transition ${
            clockedIn
              ? 'bg-gray-400 cursor-not-allowed'
              : site
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 cursor-not-allowed text-gray-600'
          }`}
        >
          {clockedIn ? 'Clocked In' : 'Clock In'}
        </button>

        {clockInTime && (
          <p className="mt-4 text-sm text-green-600">
            Clocked in at {clockInTime.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
