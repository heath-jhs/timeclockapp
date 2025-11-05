import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import jshLogo from '../assets/jsh-logo.png';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapBounds = ({ sites }) => {
  const map = useMap();
  useEffect(() => {
    const validSites = sites.filter(site => site.lat && site.lon);
    if (validSites.length > 0) {
      const bounds = L.latLngBounds(validSites.map(site => [site.lat, site.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [sites, map]);
  return null;
};

const AdminDashboard = ({ logout }) => {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeIsAdmin, setNewEmployeeIsAdmin] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSites, setSelectedSites] = useState([]);
  const [newAssignStart, setNewAssignStart] = useState(null);
  const [newAssignEnd, setNewAssignEnd] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [siteSort, setSiteSort] = useState('Recent');
  const [siteSearch, setSiteSearch] = useState('');
  const [reportTab, setReportTab] = useState('comparison');
  const [reportStart, setReportStart] = useState(new Date(new Date().setDate(new Date().getDate() - 30))); // Default last 30 days
  const [reportEnd, setReportEnd] = useState(new Date());

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  const refreshAll = async () => {
    setError(null);
    await Promise.all([
      fetchEmployees(),
      fetchSites(),
      fetchAssignments(),
      fetchTimeEntries()
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setEmployees(data);
    } catch (err) {
      setError('Employees fetch failed: ' + err.message);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSites(data);
    } catch (err) {
      setError('Sites fetch failed: ' + err.message);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_sites')
        .select('*, employee:employee_id ( username, full_name ), site:site_id ( name )')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setAssignments(data);
    } catch (err) {
      setError('Assignments fetch failed: ' + err.message);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, employee:employee_id ( username, full_name ), site:site_id ( name )')
        .order('clock_in_time', { ascending: false });
      if (error) throw error;
      setTimeEntries(data);
    } catch (err) {
      setError('Time entries fetch failed: ' + err.message);
    }
  };

  const updateProfile = async (id, field, value) => {
    try {
      const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const addEmployee = async () => {
    try {
      const response = await fetch('/.netlify/functions/add-user', {
        method: 'POST',
        body: JSON.stringify({ email: newEmployeeEmail, name: newEmployeeName, isAdmin: newEmployeeIsAdmin }),
      });
      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || 'Failed to add user');
      }
      setNewEmployeeEmail('');
      setNewEmployeeName('');
      setNewEmployeeIsAdmin(false);
      setError(null);
      setSuccess('Employee added successfully');
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Employee deleted successfully');
      setError(null);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSite = async () => {
    if (!newSiteName || !newSiteAddress) {
      setError('Please provide both site name and address');
      return;
    }
    try {
      const geocodeResponse = await fetch('/.netlify/functions/geocode', {
        method: 'POST',
        body: JSON.stringify({ address: newSiteAddress }),
      });
      if (!geocodeResponse.ok) {
        const { message } = await geocodeResponse.json();
        throw new Error(message || 'Geocoding failed - address not found');
      }
      const { lat, lon } = await geocodeResponse.json();
      const { error } = await supabase.from('sites').insert({ name: newSiteName, address: newSiteAddress, lat, lon });
      if (error) throw error;
      setNewSiteName('');
      setNewSiteAddress('');
      setError(null);
      setSuccess('Site added successfully');
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const assignSites = async () => {
    try {
      const inserts = selectedSites.map(siteId => ({ 
        employee_id: selectedEmployee, 
        site_id: siteId, 
        start_date: newAssignStart ? new Date(newAssignStart).toISOString() : null,
        end_date: newAssignEnd ? new Date(newAssignEnd).toISOString() : null 
      }));
      const { error } = await supabase.from('employee_sites').insert(inserts);
      if (error) throw error;
      setSelectedEmployee('');
      setSelectedSites([]);
      setNewAssignStart(null);
      setNewAssignEnd(null);
      setError(null);
      setSuccess('Sites assigned successfully');
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const calculateDuration = (entry) => {
    if (!entry.end_date && !entry.clock_out_time) return 'Ongoing';
    if (!entry.start_date && !entry.clock_in_time) return 'Undated';
    const start = new Date(entry.start_date || entry.clock_in_time);
    const end = new Date(entry.end_date || entry.clock_out_time);
    const diff = (end - start) / (1000 * 60 * 60); // hours
    return diff.toFixed(2) + ' hours';
  };

  const getSiteAssignments = (siteId) => {
    return assignments.filter(a => a.site_id === siteId).map(a => `${a.employee.full_name || a.employee.username} (${a.start_date ? new Date(a.start_date).toLocaleString() : 'N/A'} - ${a.end_date ? new Date(a.end_date).toLocaleString() : 'N/A'}, ${calculateDuration(a)})`).join('\n');
  };

  const sortSites = (sites, sortType) => {
    if (sortType === 'A-Z') {
      return [...sites].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === 'Z-A') {
      return [...sites].sort((a, b) => b.name.localeCompare(a.name));
    }
    return sites; // Recent is default from DB order
  };

  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(siteSearch.toLowerCase()) || 
    site.address.toLowerCase().includes(siteSearch.toLowerCase())
  );

  const sortedSites = sortSites(filteredSites, siteSort);

  // Report calculations
  const getWorkedHours = (employeeId, siteId, startDate, endDate) => {
    const filteredEntries = timeEntries.filter(entry => 
      entry.employee_id === employeeId && 
      entry.site_id === siteId && 
      new Date(entry.clock_in_time) >= startDate && 
      new Date(entry.clock_in_time) <= endDate
    );
    return filteredEntries.reduce((total, entry) => {
      if (entry.clock_out_time) {
        const start = new Date(entry.clock_in_time);
        const end = new Date(entry.clock_out_time);
        return total + (end - start) / (1000 * 60 * 60);
      }
      return total;
    }, 0);
  };

  const getBudgetedHours = (employee, assignment, startDate, endDate) => {
    const assignStart = new Date(assignment.start_date || startDate);
    const assignEnd = new Date(assignment.end_date || endDate);
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const overlapStart = new Date(Math.max(assignStart, periodStart));
    const overlapEnd = new Date(Math.min(assignEnd, periodEnd));
    if (overlapStart > overlapEnd) return 0;
    const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
    return days * (employee.work_hours || 8);
  };

  const getEfficiencyData = (employeeId) => {
    const employeeAssignments = assignments.filter(a => a.employee_id === employeeId);
    const data = employeeAssignments.map(a => {
      const worked = getWorkedHours(employeeId, a.site_id, reportStart, reportEnd);
      const scheduled = getBudgetedHours(employees.find(e => e.id === employeeId), a, reportStart, reportEnd);
      const efficiency = scheduled > 0 ? (worked / scheduled * 100).toFixed(2) : 0;
      return { site: a.site.name, efficiency };
    });
    return {
      labels: data.map(d => d.site),
      datasets: [{
        label: 'Efficiency (%)',
        data: data.map(d => d.efficiency),
        borderColor: '#4299e1',
        backgroundColor: 'rgba(66, 153, 225, 0.5)',
      }],
    };
  };

  const comparisonData = employees.flatMap(emp => {
    return assignments.filter(a => a.employee_id === emp.id).map(a => {
      const worked = getWorkedHours(emp.id, a.site_id, reportStart, reportEnd);
      const scheduled = getBudgetedHours(emp, a, reportStart, reportEnd);
      const variance = worked - scheduled;
      const efficiency = scheduled > 0 ? (worked / scheduled * 100).toFixed(2) : 0;
      return { employee: emp.full_name || emp.username, site: a.site.name, worked, scheduled, variance, efficiency };
    });
  });

  const payrollData = sites.map(site => {
    const siteAssignments = assignments.filter(a => a.site_id === site.id);
    const siteEmployees = siteAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (!emp) return null;
      const budgeted = getBudgetedHours(emp, a, reportStart, reportEnd);
      const logged = getWorkedHours(emp.id, site.id, reportStart, reportEnd);
      return { employee: emp.full_name || emp.username, budgeted, logged };
    }).filter(Boolean);
    return { site: site.name, employees: siteEmployees };
  }).filter(group => group.employees.length > 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <img src={jshLogo} alt="JSH Logo" style={{ maxHeight: '60px' }} />
      </div>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
      {error && <div style={{ background: '#fed7d7', color: '#9b2c2c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
        {error} <button onClick={refreshAll} style={{ background: '#4299e1', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', marginLeft: '1rem' }}>Retry</button>
      </div>}
      {success && <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{success}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Employee</h2>
          <div style={{ width: '100%' }}>
            <input type="text" placeholder="Full Name" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: '100%' }}>
            <input type="email" placeholder="Email" value={newEmployeeEmail} onChange={e => setNewEmployeeEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <input type="checkbox" checked={newEmployeeIsAdmin} onChange={e => setNewEmployeeIsAdmin(e.target.checked)} style={{ marginRight: '0.5rem' }} /> Admin
          </label>
          <button onClick={addEmployee} style={{ width: '100%', background: '#4299e1', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add Employee</button>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Add Site</h2>
          <div style={{ width: '100%' }}>
            <input type="text" placeholder="Site Name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: '100%' }}>
            <input type="text" placeholder="American Address (e.g., 123 Main St, City, State ZIP)" value={newSiteAddress} onChange={e => setNewSiteAddress(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <button onClick={addSite} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Add Site</button>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Assign Sites to Employee</h2>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }}>
            <option value="">Select Employee</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>)}
          </select>
          <input type="text" placeholder="Search Sites" value={siteSearch} onChange={e => setSiteSearch(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          <select value={siteSort} onChange={e => setSiteSort(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', boxSizing: 'border-box' }}>
            <option>Recent</option>
            <option>A-Z</option>
            <option>Z-A</option>
          </select>
          <div style={{ marginBottom: '1rem' }}>
            {sortedSites.map(site => (
              <label key={site.id} style={{ display: 'block', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={selectedSites.includes(site.id)} onChange={() => {
                  setSelectedSites(prev => prev.includes(site.id) ? prev.filter(s => s !== site.id) : [...prev, site.id]);
                }} style={{ marginRight: '0.5rem' }} /> {site.name}
              </label>
            ))}
          </div>
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <DatePicker selected={newAssignStart} onChange={date => setNewAssignStart(date)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" placeholderText="Start Date (optional)" className="w-full p-3 border border-gray-300 rounded-md box-border" />
          </div>
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <DatePicker selected={newAssignEnd} onChange={date => setNewAssignEnd(date)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" placeholderText="End Date (optional)" className="w-full p-3 border border-gray-300 rounded-md box-border" />
          </div>
          <button onClick={assignSites} style={{ width: '100%', background: '#4299e1', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Assign Sites</button>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}>
          <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Employees</h2>
          <ul style={{ listStyleType: 'none' }}>
            {employees.map(emp => (
              <li key={emp.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {emp.full_name ? `${emp.full_name} (${emp.username})` : emp.username} ({emp.role || 'Employee'})
                  <button onClick={() => deleteEmployee(emp.id)} style={{ background: '#f56565', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}>Delete</button>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '0.5rem' }}>Name:</span>
                  <input type="text" defaultValue={emp.full_name || ''} onBlur={e => updateProfile(emp.id, 'full_name', e.target.value)} style={{ padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', marginRight: '1rem', flex: '1' }} />
                  <span style={{ marginRight: '0.5rem' }}>Daily Work Hours:</span>
                  <input type="number" defaultValue={emp.work_hours || 8} onBlur={e => updateProfile(emp.id, 'work_hours', e.target.value)} style={{ width: '50px', padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', marginRight: '1rem' }} />
                  <span style={{ marginRight: '0.5rem' }}>Start:</span>
                  <input type="time" defaultValue={emp.daily_start || '09:00'} onBlur={e => updateProfile(emp.id, 'daily_start', e.target.value + ':00')} style={{ padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', marginRight: '1rem' }} />
                  <span style={{ marginRight: '0.5rem' }}>End:</span>
                  <input type="time" defaultValue={emp.daily_end || '17:00'} onBlur={e => updateProfile(emp.id, 'daily_end', e.target.value + ':00')} style={{ padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Employee Assignments</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Site</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Start</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>End</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assign, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.5rem' }}>{assign.employee?.full_name || assign.employee?.username || 'Unknown'}</td>
                <td style={{ padding: '0.5rem' }}>{assign.site?.name || 'Unknown'}</td>
                <td style={{ padding: '0.5rem' }}>{assign.start_date ? new Date(assign.start_date).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '0.5rem' }}>{assign.end_date ? new Date(assign.end_date).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '0.5rem' }}>{calculateDuration(assign)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Time Entries</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Site</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Clock In</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Clock Out</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((entry, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.5rem' }}>{entry.employee?.full_name || entry.employee?.username || 'Unknown'}</td>
                <td style={{ padding: '0.5rem' }}>{entry.site?.name || 'Unknown'}</td>
                <td style={{ padding: '0.5rem' }}>{new Date(entry.clock_in_time).toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>{entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '0.5rem' }}>{calculateDuration(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Sites Map</h2>
        <MapContainer center={[37.0902, -95.7129]} zoom={4} style={{ height: '400px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapBounds sites={sites} />
          {sites.map(site => site.lat && site.lon && (
            <Marker key={site.id} position={[site.lat, site.lon]}>
              <Popup>
                {site.name} - {site.address}<br />
                Assigned Employees:<br />
                {getSiteAssignments(site.id) || 'None'}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Reports</h2>
        <div style={{ display: 'flex', marginBottom: '1rem' }}>
          <div style={{ marginRight: '1rem' }}>
            <DatePicker selected={reportStart} onChange={date => setReportStart(date)} dateFormat="MMMM d, yyyy" placeholderText="Start Date" className="p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <DatePicker selected={reportEnd} onChange={date => setReportEnd(date)} dateFormat="MMMM d, yyyy" placeholderText="End Date" className="p-2 border border-gray-300 rounded-md" />
          </div>
        </div>
        {(!reportStart || !reportEnd) && <p style={{ color: '#9b2c2c', marginBottom: '1rem' }}>Please select a date range to view reports.</p>}
        {reportStart && reportEnd && (
          <div style={{ display: 'flex', marginBottom: '1rem' }}>
            <button onClick={() => setReportTab('comparison')} style={{ marginRight: '1rem', padding: '0.5rem 1rem', background: reportTab === 'comparison' ? '#4299e1' : '#e2e8f0', color: reportTab === 'comparison' ? 'white' : '#2d3748', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Worked vs Scheduled</button>
            <button onClick={() => setReportTab('timelines')} style={{ marginRight: '1rem', padding: '0.5rem 1rem', background: reportTab === 'timelines' ? '#4299e1' : '#e2e8f0', color: reportTab === 'timelines' ? 'white' : '#2d3748', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Efficiency Timelines</button>
            <button onClick={() => setReportTab('payroll')} style={{ padding: '0.5rem 1rem', background: reportTab === 'payroll' ? '#4299e1' : '#e2e8f0', color: reportTab === 'payroll' ? 'white' : '#2d3748', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Payroll Report</button>
          </div>
        )}
        {reportStart && reportEnd && reportTab === 'comparison' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Site</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Worked Hours</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Scheduled Hours</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Variance</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Efficiency (%)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.5rem' }}>{row.employee}</td>
                  <td style={{ padding: '0.5rem' }}>{row.site}</td>
                  <td style={{ padding: '0.5rem' }}>{row.worked.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>{row.scheduled.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>{row.variance.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>{row.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {reportStart && reportEnd && reportTab === 'timelines' && employees.map(emp => (
          <div key={emp.id} style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#2d3748', fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>{emp.full_name || emp.username} Efficiency Timeline</h3>
            <Line data={getEfficiencyData(emp.id)} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Efficiency Over Assignments' } } }} />
          </div>
        ))}
        {reportStart && reportEnd && reportTab === 'payroll' && payrollData.map((group, groupIndex) => (
          <div key={groupIndex} style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#2d3748', fontSize: '1rem', fontWeight: '600' }}>{group.site}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Budgeted Hours</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Logged Hours</th>
                </tr>
              </thead>
              <tbody>
                {group.employees.map((emp, empIndex) => (
                  <tr key={empIndex} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}>{emp.employee}</td>
                    <td style={{ padding: '0.5rem' }}>{emp.budgeted.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>{emp.logged.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <button onClick={logout} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
