// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AdminDashboard({ user }) {
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(false);

  // New site form state
  const [siteForm, setSiteForm] = useState({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: ''
  });
  const [geocodeError, setGeocodeError] = useState('');

  // US States dropdown
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  useEffect(() => {
    fetchSites();
    fetchEmployees();
  }, []);

  const fetchSites = async () => {
    const { data } = await supabase.from('sites').select('*');
    setSites(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'employee');
    setEmployees(data || []);
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeocodeError('');

    if (!siteForm.name || !siteForm.street_address || !siteForm.city || !siteForm.state || !siteForm.zip_code) {
      setGeocodeError('All fields required');
      setLoading(false);
      return;
    }

    const fullAddress = `${siteForm.street_address}, ${siteForm.city}, ${siteForm.state} ${siteForm.zip_code}`;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`
      );
      const geoData = await response.json();

      if (geoData.status !== 'OK' || !geoData.results[0]) {
        throw new Error('Invalid address — try again');
      }

      const { lat, lng } = geoData.results[0].geometry.location;

      const { error } = await supabase.from('sites').insert({
        name: siteForm.name,
        street_address: siteForm.street_address,
        city: siteForm.city,
        state: siteForm.state,
        zip_code: siteForm.zip_code,
        latitude: lat,
        longitude: lng
      });

      if (error) throw error;

      setSiteForm({ name: '', street_address: '', city: '', state: '', zip_code: '' });
      fetchSites();
    } catch (error) {
      setGeocodeError(error.message);
    }
    setLoading(false);
  };

  const handleAssignEmployee = async () => {
    if (!selectedSite || !selectedEmployee) return;
    const { error } = await supabase
      .from('employee_sites')
      .upsert({ employee_id: selectedEmployee, site_id: selectedSite });
    if (error) alert(error.message);
    else {
      setSelectedEmployee('');
      setSelectedSite('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Add New Site Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Site</h2>
        <form onSubmit={handleAddSite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Site Name (e.g., Main Office)"
            value={siteForm.name}
            onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Street Address"
            value={siteForm.street_address}
            onChange={(e) => setSiteForm({ ...siteForm, street_address: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="City"
            value={siteForm.city}
            onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
            className="p-2 border rounded"
            required
          />
          
