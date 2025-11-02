import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClockIn({ user }) {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('Locating...');
  const [streak, setStreak] = useState(0);
  const [lastClockIn, setLastClockIn] = useState(null);

  const site = {
    id: 1,
    name: 'Office',
    latitude: 40.7128,
    longitude: -74.0060,
    radius_meters: 100
  };

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(current);

        const distance = haversine(current, { lat: site.latitude, lng: site.longitude });

        if (distance <= site.radius_meters) {
          if (!lastClockIn || Date.now() - lastClockIn > 5 * 60 * 1000) {
            await clockIn();
          }
          setStatus(`At ${site.name}`);
        } else {
          setStatus(`Outside (${distance.toFixed(0)}m away)`);
        }
      },
      err => setStatus('GPS error'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    loadStreak();

    return () => navigator.geolocation.clearWatch(watch);
  }, [lastClockIn]);

  const clockIn = async () => {
    const { error } = await supabase.from('clock_ins').insert({
      user_id: user.id,
      site_id: site.id,
      time_in: new Date().toISOString(),
      lat: position.lat,
      lng: position.lng
    });

    if (!error) {
      setLastClockIn(Date.now());
      updateStreak();
    }
  };

  const loadStreak = async () => {
    const { data } = await supabase
      .from('clock_ins')
      .select('time_in')
      .eq('user_id', user.id)
      .order('time_in', { ascending: false })
      .limit(30);

    const dates = [...new Set(data.map(d => new Date(d.time_in).toDateString()))];
    const today = new Date().toDateString();
    let currentStreak = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (dates.includes(date.toDateString())) currentStreak++;
      else break;
    }
    setStreak(currentStreak);
  };

  const updateStreak = () => loadStreak();

  const haversine = (p1, p2) => {
    const toRad = x => x * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow text-center">
      <h1 className="text-2xl font-bold mb-4">Time Clock</h1>
      <p className="text-lg font-medium mb-2">{status}</p>
      {position && <p className="text-sm text-gray-600 mb-4">GPS: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>}
      <div className="text-3xl font-bold text-green-600">
        🔥 {streak} Day Streak
      </div>
    </div>
  );
}
