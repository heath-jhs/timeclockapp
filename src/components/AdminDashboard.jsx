import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthProvider';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) fetchSites();
  }, [user]);

  const fetchSites = async () => {
    const { data, error } = await supabase.from('sites').select('*');
    if (error) console.error(error);
    else setSites(data || []);
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Geocoding address:', siteAddress); // Debug
      const res = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: siteAddress }),
      });
      console.log('Full geocode response:', res); // Debug status/body
      if (!res.ok) throw new Error('Geocode function error: ' + res.status);
      const { lat, lng } = await res.json();
      console.log('Geocode success:', lat, lng); // Debug
      const { error: insertError } = await supabase
        .from('sites')
        .insert({ name: siteName, address: siteAddress, lat, lng });
      if (insertError) throw insertError;
      alert('Site created successfully!');
      setSiteName('');
      setSiteAddress('');
      fetchSites();
    } catch (err) {
      console.error('Geocode/create error:', err);
      setError('Geocoding failed: ' + err.message);
      alert('Geocoding failed – check console/Network for details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleCreateSite} className="mb-8">
        <input
          type="text"
          placeholder="Site Name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="border p-2 mr-2"
          required
        />
        <input
          type="text"
          placeholder="Site Address (e.g., 1600 Amphitheatre Parkway, Mountain View, CA)"
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          className="border p-2 mr-2 w-96"
          required
        />
        <button type="submit" disabled={loading} className="bg-blue-500 text-white p-2">
          {loading ? 'Creating...' : 'Create Site'}
        </button>
      </form>
      <h2 className="text-xl font-semibold mb-2">Sites</h2>
      <ul>
        {sites.map((site) => (
          <li key={site.id}>{site.name} - {site.address} ({site.lat}, {site.lng})</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
