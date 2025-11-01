// FORCE REBUILD — SITES LOADED — 2025-11-01
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClockIn({ user }) {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('employee_sites')
      .select('site_id, sites!inner(id, name, latitude, longitude, radius_meters)')
      .eq('employee_id', user.id)
      .then(({ data }) => {
        const siteList = data || [];
        setSites(siteList);
        if (siteList.length === 1) setSelectedSite(siteList[0].site_id);
        setLoading(false);
      });
  }, [user.id]);

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => setError('GPS error: ' + err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const clockIn = async () => {
    if (!selectedSite || !position) return setError('Select site + allow GPS');

    const site = sites.find(s => s.site_id === parseInt(selectedSite)).sites;
    const distance = haversine(position, { lat: site.latitude, lng: site.longitude });

    if (distance > site.radius_meters) {
      return setError(`Too far! Must be within ${site.radius_meters}m (at ${distance.toFixed(0)}m)`);
    }

    const { error } = await supabase.from('clock_ins').insert({
      user_id: user.id,
      site_id: selectedSite,
      time_in: new Date().toISOString(),
      lat: position.lat,
      lng: position.lng
    });

    if (error) setError(error.message);
    else alert('Clocked in at ' + site.name + '!');
  };

  const haversine = (p1, p2) => {
    const toRad = x => x * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  if (loading) return <p>Loading sites...</p>;

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Clock In</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <select
        value={selectedSite}
        onChange={e => setSelectedSite(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        disabled={sites.length === 0}
      >
        <option value="">Select Site</option>
        {sites.map(s => (
          <option key={s.site_id} value={s.site_id}>{s.sites.name}</option>
        ))}
      </select>

      {position && <p className="text-sm text-gray-600 mb-2">GPS: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>}

      <button
        onClick={clockIn}
        disabled={!selectedSite || !position}
        className="w-full py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        Clock In (Geo-Verified)
      </button>

      {sites.length === 0 && <p className="text-red-500 mt-4">No sites assigned. Contact admin.</p>}
    </div>
  );
}
