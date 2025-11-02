import { useState } from 'react';

export default function ClockIn({ user }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  // HARD-CODED SITE (Bypass DB)
  const site = {
    id: 1,
    name: 'Office',
    latitude: 40.7128,
    longitude: -74.0060,
    radius_meters: 100
  };

  // GPS
  useState(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => setError('GPS: ' + err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const clockIn = () => {
    if (!position) return setError('Waiting for GPS');

    const distance = haversine(position, { lat: site.latitude, lng: site.longitude });
    if (distance > site.radius_meters) {
      return setError(`Too far! Must be within 100m`);
    }

    alert(`Clocked in at ${site.name}!`);
  };

  const haversine = (p1, p2) => {
    const toRad = x => x * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Clock In</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {position && <p className="text-sm text-gray-600 mb-4">GPS: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>}
      <button onClick={clockIn} className="w-full py-2 bg-green-600 text-white rounded">
        Clock In (Hard-Coded Site)
      </button>
    </div>
  );
}
