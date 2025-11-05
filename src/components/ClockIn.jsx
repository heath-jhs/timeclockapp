import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClockIn({ user }) {
  const [sites, setSites] = useState([]);
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('Locating...');
  const [streak, setStreak] = useState(0);

  // ---------- LOAD SITES ----------
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('employee_sites')
        .select('site_id, sites!inner(*)')
        .eq('employee_id', user.id);
      setSites(data || []);
    };
    load();
  }, [user.id]);

  // ---------- GPS + AUTO CLOCK ----------
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      async pos => {
        const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(cur);

        let inside = false;
        for (const s of sites) {
          const dist = haversine(cur, { lat: s.sites.latitude, lng: s.sites.longitude });
          if (dist <= s.sites.radius_meters) {
            setStatus(`At ${s.sites.name}`);
            await ensureClockIn(s.site_id, cur);
            inside = true;
            break;
          }
        }
        if (!inside) setStatus(`Outside`);
      },
      err => setStatus('GPS error'),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sites]);

  const ensureClockIn = async (siteId, pos) => {
    const { data: open } = await supabase
      .from('clock_ins')
      .select('id')
      .eq('user_id', user.id)
      .is('time_out', null)
      .single();

    if (!open) {
      await supabase.from('clock_ins').insert({
        user_id: user.id,
        site_id: siteId,
        time_in: new Date().toISOString(),
        lat: pos.lat,
        lng: pos.lng
      });
    }
  };

  // ---------- STREAK ----------
  useEffect(() => {
    const calcStreak = async () => {
      const { data } = await supabase
        .from('clock_ins')
        .select('time_in')
        .eq('user_id', user.id)
        .order('time_in', { ascending: false })
        .limit(30);

      const days = new Set(data.map(r => new Date(r.time_in).toDateString()));
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (days.has(d.toDateString())) count++;
        else break;
      }
      setStreak(count);
    };
    calcStreak();
  }, [user.id]);

  const haversine = (p1, p2) => {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const openMaps = (site) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow text-center">
      <h1 className="text-2xl font-bold mb-4">Time Clock</h1>
      <p className="text-lg">{status}</p>
      {position && (
        <p className="text-sm text-gray-600 mb-4">
          GPS: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
      <div className="text-3xl font-bold text-green-600 mt-6">
        🔥 {streak} Day Streak
      </div>

      {sites.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Your Sites</h2>
          {sites.map(s => (
            <div key={s.site_id} className="flex justify-between items-center p-2 border-b">
              <span>{s.sites.name}</span>
              <button
                onClick={() => openMaps(s.sites)}
                className="text-blue-600 underline text-sm"
              >
                Navigate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
