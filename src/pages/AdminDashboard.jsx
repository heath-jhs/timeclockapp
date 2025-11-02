import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { saveAs } from 'file-saver';

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [liveLocations, setLiveLocations] = useState({});
  const [newSite, setNewSite] = useState({ name: '', lat: '', lng: '', radius: 100 });
  const [assign, setAssign] = useState({ employee: '', site: '' });

  // Load static data
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(r => setEmployees(r.data || []));
    supabase.from('sites').select('*').then(r => setSites(r.data || []));
  }, []);

  // Real-time employee locations
  useEffect(() => {
    const channel = supabase
      .channel('public:clock_ins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clock_ins', filter: 'time_out=is.null' },
        payload => {
          const rec = payload.new;
          setLiveLocations(prev => ({
            ...prev,
            [rec.user_id]: { lat: rec.lat, lng: rec.lng }
          }));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const addSite = async () => {
    await supabase.from('sites').insert({
      name: newSite.name,
      latitude: parseFloat(newSite.lat),
      longitude: parseFloat(newSite.lng),
      radius_meters: parseInt(newSite.radius)
    });
    setNewSite({ name: '', lat: '', lng: '', radius: 100 });
    supabase.from('sites').select('*').then(r => setSites(r.data || []));
  };

  const assignSite = async () => {
    await supabase.from('employee_sites').upsert({
      employee_id: assign.employee,
      site_id: assign.site
    });
    alert('Assigned!');
  };

  const exportHours = async () => {
    const { data } = await supabase.from('clock_ins').select('*').order('time_in', { ascending: false });
    const csv = [
      ['Employee ID', 'Site ID', 'Time In', 'Time Out', 'Lat', 'Lng'],
      ...data.map(r => [
        r.user_id,
        r.site_id,
        r.time_in,
        r.time_out || '',
        r.lat,
        r.lng
      ])
    ]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `hours_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Add Site */}
      <div className="mb-8 p-6 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-4">Add Site</h2>
        <input placeholder="Name" value={newSite.name} onChange={e => setNewSite({ ...newSite, name: e.target.value })} className="p-2 border mr-2" />
        <input placeholder="Lat" value={newSite.lat} onChange={e => setNewSite({ ...newSite, lat: e.target.value })} className="p-2 border mr-2" />
        <input placeholder="Lng" value={newSite.lng} onChange={e => setNewSite({ ...newSite, lng: e.target.value })} className="p-2 border mr-2" />
        <input placeholder="Radius (m)" value={newSite.radius} onChange={e => setNewSite({ ...newSite, radius: e.target.value })} className="p-2 border mr-2" />
        <button onClick={addSite} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Assign */}
      <div className="mb-8 p-6 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-4">Assign Employee</h2>
        <select value={assign.employee} onChange={e => setAssign({ ...assign, employee: e.target.value })} className="p-2 border mr-2">
          <option value="">Employee</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name || e.id}</option>)}
        </select>
        <select value={assign.site} onChange={e => setAssign({ ...assign, site: e.target.value })} className="p-2 border mr-2">
          <option value="">Site</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={assignSite} className="bg-green-600 text-white px-4 py-2 rounded">Assign</button>
      </div>

      {/* Live Map */}
      <div className="mb-8 p-6 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-4">Live Employee Locations</h2>
        <div style={{ height: 400 }} id="map"></div>
        <script src={`https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_KEY&callback=initMap`} async defer></script>
        <script>
          {`
            function initMap() {
              const map = new google.maps.Map(document.getElementById('map'), { center: { lat: 0, lng: 0 }, zoom: 2 });
              const markers = {};
              const locations = ${JSON.stringify(liveLocations)};
              Object.entries(locations).forEach(([uid, pos]) => {
                const marker = new google.maps.Marker({ position: pos, map });
                markers[uid] = marker;
              });
              // Real-time updates via Supabase
              const channel = supabase.channel('public:clock_ins')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'clock_ins', filter: 'time_out=is.null' }, payload => {
                  const rec = payload.new;
                  if (markers[rec.user_id]) {
                    markers[rec.user_id].setPosition({ lat: rec.lat, lng: rec.lng });
                  } else {
                    markers[rec.user_id] = new google.maps.Marker({ position: { lat: rec.lat, lng: rec.lng }, map });
                  }
                }).subscribe();
            }
          `}
        </script>
      </div>

      {/* Export */}
      <button onClick={exportHours} className="bg-purple-600 text-white px-6 py-2 rounded">
        Download Hours CSV
      </button>
    </div>
  );
}
