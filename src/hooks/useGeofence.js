import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as turf from '@turf/turf';

const GEOFENCE_RADIUS = 100; // meters

export function useGeofence() {
  const watchId = useRef(null);
  const currentSite = useRef(null);

  const checkGeofence = async (lat, lng) => {
    const { data: sites, error } = await supabase
      .from('sites')
      .select('id, name, lat, lng, address')
      .neq('lat', null)
      .neq('lng', null);

    if (error || !sites) return;

    for (const site of sites) {
      const distance = turf.distance(
        turf.point([lng, lat]),
        turf.point([site.lng, site.lat]),
        { units: 'meters' }
      );

      if (distance <= GEOFENCE_RADIUS) {
        if (currentSite.current?.id !== site.id) {
          await logEntry(site, 'in');
          currentSite.current = site;
          notify(`Clocked IN at ${site.name}`);
        }
        return;
      }
    }

    if (currentSite.current) {
      await logEntry(currentSite.current, 'out');
      notify(`Clocked OUT from ${currentSite.current.name}`);
      currentSite.current = null;
    }
  };

  const logEntry = async (site, type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('time_logs').insert({
      user_id: user.id,
      site_id: site.id,
      type,
      timestamp: new Date().toISOString(),
      lat: type === 'in' ? site.lat : null,
      lng: type === 'in' ? site.lng : null
    });
  };

  const notify = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TimeClock', { body: message });
    }
  };

  const startTracking = async () => {
    if (!('geolocation' in navigator)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        checkGeofence(latitude, longitude);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );
  };

  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  useEffect(() => {
    return stopTracking;
  }, []);

  return { startTracking, stopTracking };
}
