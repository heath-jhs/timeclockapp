import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  doc, updateDoc, collection, query, where, onSnapshot, getDocs, serverTimestamp
} from 'firebase/firestore';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import { format, startOfDay, isWithinInterval, setHours, setMinutes } from 'date-fns';

const mapContainerStyle = { width: '100%', height: '300px' };

export default function EmployeeDashboard({ user }) {
  const [sites, setSites] = useState([]);
  const [clockedIn, setClockedIn] = useState(null);
  const [position, setPosition] = useState(null);
  const [dailyHours, setDailyHours] = useState(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const watchId = useRef(null);

  // Load assigned sites
  useEffect(() => {
    const q = query(collection(db, 'sites'), where('assignedEmployees', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(loaded);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Load current clock-in
  useEffect(() => {
    const today = startOfDay(new Date());
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('clockIn', '>=', today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = records.find(r => !r.clockOut);
      setClockedIn(active || null);
      calculateDailyHours(records);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const calculateDailyHours = (records) => {
    const totalMs = records.reduce((sum, r) => {
      if (r.clockOut) {
        return sum + (r.clockOut.toDate() - r.clockIn.toDate());
      }
      return sum;
    }, 0);
    setDailyHours(totalMs / (1000 * 60 * 60));
  };

  // Geofencing + Schedule Logic
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const checkSchedule = () => {
      const now = new Date();
      const day = format(now, 'EEE').toLowerCase().slice(0, 3);
      const sched = user.trackingSchedule?.[day] || { enabled: false };
      if (!sched.enabled) return false;

      const [startH, startM] = sched.start.split(':').map(Number);
      const [endH, endM] = sched.end.split(':').map(Number);
      const start = setMinutes(setHours(now, startH), startM);
      const end = setMinutes(setHours(now, endH), endM);

      return isWithinInterval(now, { start, end });
    };

    const startTracking = () => {
      if (watchId.current) return;
      setTrackingActive(true);
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          checkGeofence(newPos);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
      if (!checkSchedule()) return;

      for (const site of sites) {
        const dist = getDistance(pos, site.location);
        if (dist <= 100 && !clockedIn) {
          await clockIn(site);
        } else if (dist > 100 && clockedIn?.siteId === site.id) {
          await clockOut();
        }
      }
    };

    if (checkSchedule()) {
      startTracking();
    } else {
      stopTracking();
    }

    const interval = setInterval(() => {
      if (checkSchedule()) startTracking();
      else stopTracking();
    }, 60_000);

    return () => {
      clearInterval(interval);
      stopTracking();
    };
  }, [user.trackingSchedule, sites, clockedIn]);

  const getDistance = (p1, p2) => {
    const R = 6371000;
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const clockIn = async (site) => {
    const record = await addDoc(collection(db, 'attendance'), {
      userId: user.uid,
      siteId: site.id,
      siteName: site.name,
      clockIn: serverTimestamp(),
      clockOut: null
    });
    setClockedIn({ id: record.id, siteId: site.id, siteName: site.name });
  };

  const clockOut = async () => {
    if (!clockedIn) return;
    await updateDoc(doc(db, 'attendance', clockedIn.id), {
      clockOut: serverTimestamp()
    });
    setClockedIn(null);
  };

  const manualClockOut = async () => {
    await clockOut();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <div className="text-sm">
          {trackingActive ? '🟢 Tracking Active' : '⚫ Tracking Off'}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="font-semibold">Today’s Hours: {dailyHours.toFixed(2)} hrs</p>
        {clockedIn && (
          <p className="text-green-600">Clocked in at: {clockedIn.siteName}</p>
        )}
        {clockedIn && (
          <button
            onClick={manualClockOut}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Manual Clock Out
          </button>
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
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
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
          zoom={position ? 16 : 10}
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
        <a href="/history" className="text-blue-600 hover:underline">
          View Clock History →
        </a>
      </div>
    </div>
  );
}
