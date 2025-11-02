import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.js';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import { format, isWithinInterval, setHours, setMinutes } from 'date-fns';

const mapContainerStyle = { width: '100%', height: '300px' };

export default function EmployeeDashboard({ user }) {
  const [sites, setSites] = useState([]);
  const [clockedIn, setClockedIn] = useState(null);
  const [position, setPosition] = useState(null);
  const [dailyHours, setDailyHours] = useState(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const watchId = useRef(null);

  // Fetch assigned sites
  useEffect(() => {
    const fetchSites = async () => {
      const { data } = await supabase
        .from('sites')
        .select('*')
        .contains('assignedEmployees', [user.id]);
      setSites(data || []);
    };
    fetchSites();

    const channel = supabase.channel('sites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, fetchSites)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user.id]);

  // Fetch today's attendance
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const fetchAttendance = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', user.id)
        .gte('clockIn', today);
      const active = data.find(r => !r.clockOut);
      setClockedIn(active || null);
      calculateDailyHours(data);
    };
    fetchAttendance();

    const channel = supabase.channel('attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchAttendance)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user.id]);

  const calculateDailyHours = (records) => {
    const totalMs = records.reduce((sum, r) => {
      if (r.clockOut) return sum + (new Date(r.clockOut) - new Date(r.clockIn));
      return sum;
    }, 0);
    setDailyHours(totalMs / (1000 * 60 * 60));
  };

  // Geofencing + Schedule Tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    const checkSchedule = () => {
      const now = new Date();
      const day = format(now, 'EEE').toLowerCase().slice(0, 3);
      const sched = user.trackingSchedule?.[day] || { enabled: false };
      if (!sched.enabled) return false;
      const [sh, sm] = sched.start.split(':').map(Number);
      const [eh, em] = sched.end.split(':').map(Number);
      const start = setMinutes(setHours(now, sh), sm);
      const end = setMinutes(setHours(now, eh), em);
      return isWithinInterval(now, { start, end });
    };

    const startTracking = () => {
      if (watchId.current) return;
      setTrackingActive(true);
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          if (checkSchedule()) checkGeofence(newPos);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    };

    const stopTracking = () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setTrackingActive(false);
    };

    const checkGeofence = async (pos) => {
      for (const site of sites) {
        const dist = haversine(pos, site.location);
        if (dist <= 100 && !clockedIn) await clockIn(site);
        else if (dist > 100 && clockedIn?.siteId === site.id) await clockOut();
      }
    };

    const haversine = (p1, p2) => {
      const toRad = (x) => x * Math.PI / 180;
      const R = 6371000;
      const dLat = toRad(p2.lat - p1.lat);
      const dLon = toRad(p2.lng - p1.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    if (checkSchedule()) startTracking();
    else stopTracking();

    const interval = setInterval(() => {
      checkSchedule() ? startTracking() : stopTracking();
    }, 60000);

    return () => {
      clearInterval(interval);
      stopTracking();
    };
  }, [user.trackingSchedule, sites, clockedIn]);

  const clockIn = async (site) => {
    const { data } = await supabase
      .from('attendance')
      .insert({
        userId: user.id,
        siteId: site.id,
        siteName: site.name,
        clockIn: new Date().toISOString()
      })
      .select()
      .single();
    setClockedIn(data);
  };

  const clockOut = async () => {
    if (!clockedIn) return;
    await supabase
      .from('attendance')
      .update({ clockOut: new Date().toISOString() })
      .eq('id', clockedIn.id);
    setClockedIn(null);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user.email}</h1>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="font-semibold">Today's Hours: {dailyHours.toFixed(2)} hrs</p>
        <p className="text-sm">{trackingActive ? 'Tracking Active' : 'Tracking Off'}</p>
        {clockedIn && (
          <>
            <p className="text-green-600 mt-2">Clocked in at: {clockedIn.siteName}</p>
            <button
              onClick={clockOut}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Manual Clock Out
            </button>
          </>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Assigned Sites</h2>
        {sites.length === 0 ? (
          <p>No sites assigned.</p>
        ) : (
          <div className="space-y-3">
            {sites.map(site => (
              <div key={site.id} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-sm text-gray-600">{site.address}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Navigate
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={position || sites[0]?.location || { lat: 0, lng: 0 }}
          zoom={15}
          onLoad={(map) => {
            if (sites.length > 0) {
              const bounds = new window.google.maps.LatLngBounds();
              sites.forEach(s => bounds.extend(s.location));
              if (position) bounds.extend(position);
              map.fitBounds(bounds);
            }
          }}
        >
          {position && <Marker position={position} label="You" />}
          {sites.map(site => (
            <div key={site.id}>
              <Marker position={site.location} title={site.name} />
              <Circle
                center={site.location}
                radius={100}
                options={{ strokeColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            </div>
          ))}
        </GoogleMap>
      </LoadScript>

      <div className="mt-6">
        <a href="/history" className="text-blue-600 hover:underline">View Clock History →</a>
      </div>
    </div>
  );
}
