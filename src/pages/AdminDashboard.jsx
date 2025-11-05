import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
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
import { saveAs } from 'file-saver';

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

const MapBounds = ({ sites } ) => {
  const map = useMap();
  useEffect(() => {
    const validSites = sites.filter(site => site?.lat && site?.lon);
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
  const supabase = useSupabaseClient();

  const refreshAll = async () => {
    setError(null);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchSites(),
        fetchAssignments(),
        fetchTimeEntries()
      ]);
    } catch (err) {
      setError('Data refresh failed: ' + err.message);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [supabase]);

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
      setEmployees(data || []);
    } catch (err) {
      setError('Employees fetch failed: ' + err.message);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      setError('Sites fetch failed: ' + err.message);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_sites')
        .select('*, employee:profiles(full_name, username), sites!inner(name)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      setError('Assignments fetch failed: ' + err.message);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, employee:profiles(full_name, username), sites!inner(name)')
        .order('clock_in_time', { ascending: false });
      if (error) throw error;
      setTimeEntries(data || []);
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
    return assignments.filter(a => a.site_id === siteId).map(a => `${a.employee?.full_name || a.employee?.username || 'Unknown'} (${a.start_date ? new Date(a.start_date).toLocaleString() : 'N/A'} - ${a.end_date ? new Date(a.end_date).toLocaleString() : 'N/A'}, ${calculateDuration(a)})`).join('\n');
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
    return days * (employee?.work_hours || 8);
  };

  const getEfficiencyData = (employeeId) => {
    const employeeAssignments = assignments.filter(a => a.employee_id === employeeId);
    const data = employeeAssignments.map(a => {
      const worked = getWorkedHours(employeeId, a.site_id, reportStart, reportEnd);
      const scheduled = getBudgetedHours(employees.find(e => e.id === employeeId), a, reportStart, reportEnd);
      const efficiency = scheduled > 0 ? (worked / scheduled * 100).toFixed(2) : 0;
      return { site: a.sites?.name || 'Unknown', efficiency };
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
      return { employee: emp.full_name || emp.username || 'Unknown', site: a.sites?.name || 'Unknown', worked, scheduled, variance, efficiency };
    });
  });

  const payrollData = sites.map(site => {
    const siteAssignments = assignments.filter(a => a.site_id === site.id);
    const siteEmployees = siteAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (!emp) return null;
      const budgeted = getBudgetedHours(emp, a, reportStart, reportEnd);
      const logged = getWorkedHours(emp.id, site.id, reportStart, reportEnd);
      return { employee: emp.full_name || emp.username || 'Unknown', budgeted, logged };
    }).filter(Boolean);
    return { site: site.name || 'Unknown', employees: siteEmployees };
  }).filter(group => group.employees.length > 0);

  const exportToExcel = (data, fileName, sheetName, headers) => {
    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  };

  const exportComparison = () => {
    const data = comparisonData.map(row => [
      row.employee,
      row.site,
      row.worked.toFixed(2),
      row.scheduled.toFixed(2),
      row.variance.toFixed(2),
      row.efficiency + '%'
    ]);
    exportToExcel(data, 'comparison.xlsx', 'Worked vs Scheduled', ['Employee', 'Site', 'Worked Hours', 'Scheduled Hours', 'Variance', 'Efficiency (%)']);
  };

  const exportTimelines = () => {
    const wb = XLSX.utils.book_new();
    employees.forEach(emp => {
      const empData = getEfficiencyData(emp.id);
      const wsData = [
        ['Site', 'Efficiency (%)'],
        ...empData.labels.map((label, i) => [label, empData.datasets[0].data[i]])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, emp.full_name || emp.username);
    });
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'timelines.xlsx');
  };

  const exportPayroll = () => {
    const wb = XLSX.utils.book_new();
    payrollData.forEach(group => {
      const wsData = [
        ['Employee', 'Budgeted Hours', 'Logged Hours'],
        ...group.employees.map(emp => [emp.employee, emp.budgeted.toFixed(2), emp.logged.toFixed(2)])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, group.site.slice(0, 31)); // Sheet names max 31 chars
    });
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'payroll.xlsx');
  };

  return (
    <div className="p-5 max-w-7xl mx-auto bg-gray-100">
      <div className="flex justify-end items-center mb-4 flex-wrap">
        <img src={jshLogo} alt="JSH Logo" className="max-h-16" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error} <button onClick={refreshAll} className="bg-blue-500 text-white px-2 py-1 rounded-md ml-4 hover:bg-blue-600">Retry</button>
        </div>
      )}
      {success && <div className="bg-green-100 text-green-800 p-4 rounded-md mb-6">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Employee</h2>
          <input
            type="text"
            placeholder="Full Name"
            value={newEmployeeName}
            onChange={e => setNewEmployeeName(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmployeeEmail}
            onChange={e => setNewEmployeeEmail(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <label className="flex items-center mb-4">
            <input type="checkbox" checked={newEmployeeIsAdmin} onChange={e => setNewEmployeeIsAdmin(e.target.checked)} className="mr-2" /> Admin
          </label>
          <button onClick={addEmployee} className="w-full p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600">Add Employee</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Site</h2>
          <input
            type="text"
            placeholder="Site Name"
            value={newSiteName}
            onChange={e => setNewSiteName(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            placeholder="American Address (e.g., 123 Main St, City, State ZIP)"
            value={newSiteAddress}
            onChange={e => setNewSiteAddress(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <button onClick={addSite} className="w-full p-3 bg-green-500 text-white rounded-md hover:bg-green-600">Add Site</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Assign Sites to Employee</h2>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          >
            <option value="">Select Employee</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search Sites"
            value={siteSearch}
            onChange={e => setSiteSearch(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <select
            value={siteSort}
            onChange={e => setSiteSort(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          >
            <option>Recent</option>
            <option>A-Z</option>
            <option>Z-A</option>
          </select>
          <div className="mb-4">
            {sortedSites.map(site => (
              <label key={site.id} className="block mb-2">
                <input
                  type="checkbox"
                  checked={selectedSites.includes(site.id)}
                  onChange={() => {
                    setSelectedSites(prev => prev.includes(site.id) ? prev.filter(s => s !== site.id) : [...prev, site.id]);
                  }}
                  className="mr-2"
                /> {site.name}
              </label>
            ))}
          </div>
          <DatePicker
            selected={newAssignStart}
            onChange={date => setNewAssignStart(date)}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Start Date (optional)"
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <DatePicker
            selected={newAssignEnd}
            onChange={date => setNewAssignEnd(date)}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="End Date (optional)"
            className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          />
          <button onClick={assignSites} className="w-full p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600">Assign Sites</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md col-span-1 md:col-span-3">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Employees</h2>
          <ul className="list-none">
            {employees.map(emp => (
              <li key={emp.id} className="flex flex-col py-2 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  {emp.full_name ? `${emp.full_name} (${emp.username})` : emp.username} ({emp.role || 'Employee'})
                  <button onClick={() => deleteEmployee(emp.id)} className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600">Delete</button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="mr-2">Name:</span>
                  <input
                    type="text"
                    defaultValue={emp.full_name || ''}
                    onBlur={e => updateProfile(emp.id, 'full_name', e.target.value)}
                    className="p-1 border border-gray-300 rounded-md mr-4 flex-1"
                  />
                  <span className="mr-2">Daily Work Hours:</span>
                  <input
                    type="number"
                    defaultValue={emp.work_hours || 8}
                    onBlur={e => updateProfile(emp.id, 'work_hours', e.target.value)}
                    className="w-16 p-1 border border-gray-300 rounded-md mr-4"
                  />
                  <span className="mr-2">Start:</span>
                  <input
                    type="time"
                    defaultValue={emp.daily_start || '09:00'}
                    onBlur={e => updateProfile(emp.id, 'daily_start', e.target.value + ':00')}
                    className="p-1 border border-gray-300 rounded-md mr-4"
                  />
                  <span className="mr-2">End:</span>
                  <input
                    type="time"
                    defaultValue={emp.daily_end || '17:00'}
                    onBlur={e => updateProfile(emp.id, 'daily_end', e.target.value + ':00')}
                    className="p-1 border border-gray-300 rounded-md"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Employee Assignments</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-2">Employee</th>
              <th className="text-left p-2">Site</th>
              <th className="text-left p-2">Start</th>
              <th className="text-left p-2">End</th>
              <th className="text-left p-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assign, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-2">{assign.employee?.full_name || assign.employee?.username || 'Unknown'}</td>
                <td className="p-2">{assign.sites?.name || 'Unknown'}</td>
                <td className="p-2">{assign.start_date ? new Date(assign.start_date).toLocaleString() : 'N/A'}</td>
                <td className="p-2">{assign.end_date ? new Date(assign.end_date).toLocaleString() : 'N/A'}</td>
                <td className="p-2">{calculateDuration(assign)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Time Entries</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-2">Employee</th>
              <th className="text-left p-2">Site</th>
              <th className="text-left p-2">Clock In</th>
              <th className="text-left p-2">Clock Out</th>
              <th className="text-left p-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((entry, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-2">{entry.employee?.full_name || entry.employee?.username || 'Unknown'}</td>
                <td className="p-2">{entry.sites?.name || 'Unknown'}</td>
                <td className="p-2">{entry.clock_in_time ? new Date(entry.clock_in_time).toLocaleString() : 'N/A'}</td>
                <td className="p-2">{entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleString() : 'N/A'}</td>
                <td className="p-2">{calculateDuration(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sites Map</h2>
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
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Reports</h2>
        <div className="flex mb-4">
          <div className="mr-4">
            <DatePicker selected={reportStart} onChange={date => setReportStart(date)} dateFormat="MMMM d, yyyy" placeholderText="Start Date" className="p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <DatePicker selected={reportEnd} onChange={date => setReportEnd(date)} dateFormat="MMMM d, yyyy" placeholderText="End Date" className="p-2 border border-gray-300 rounded-md" />
          </div>
        </div>
        {(!reportStart || !reportEnd) && <p className="text-red-800 mb-4">Please select a date range to view reports.</p>}
        {reportStart && reportEnd && (
          <div className="flex mb-4">
            <button onClick={() => setReportTab('comparison')} className={`mr-4 px-4 py-2 rounded-md ${reportTab === 'comparison' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} hover:bg-blue-600 hover:text-white`}>Worked vs Scheduled</button>
            <button onClick={() => setReportTab('timelines')} className={`mr-4 px-4 py-2 rounded-md ${reportTab === 'timelines' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} hover:bg-blue-600 hover:text-white`}>Efficiency Timelines</button>
            <button onClick={() => setReportTab('payroll')} className={`px-4 py-2 rounded-md ${reportTab === 'payroll' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} hover:bg-blue-600 hover:text-white`}>Payroll Report</button>
          </div>
        )}
        {reportStart && reportEnd && reportTab === 'comparison' && (
          <>
            <button onClick={exportComparison} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-4">Export to Excel</button>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Site</th>
                  <th className="text-left p-2">Worked Hours</th>
                  <th className="text-left p-2">Scheduled Hours</th>
                  <th className="text-left p-2">Variance</th>
                  <th className="text-left p-2">Efficiency (%)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2">{row.employee}</td>
                    <td className="p-2">{row.site}</td>
                    <td className="p-2">{row.worked.toFixed(2)}</td>
                    <td className="p-2">{row.scheduled.toFixed(2)}</td>
                    <td className="p-2">{row.variance.toFixed(2)}</td>
                    <td className="p-2">{row.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {reportStart && reportEnd && reportTab === 'timelines' && (
          <>
            <button onClick={exportTimelines} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-4">Export to Excel</button>
            {employees.map(emp => (
              <div key={emp.id} className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{emp.full_name || emp.username} Efficiency Timeline</h3>
                <Line data={getEfficiencyData(emp.id)} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Efficiency Over Assignments' } } }} />
              </div>
            ))}
          </>
        )}
        {reportStart && reportEnd && reportTab === 'payroll' && (
          <>
            <button onClick={exportPayroll} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-4">Export to Excel</button>
            {payrollData.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{group.site}</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-left p-2">Budgeted Hours</th>
                      <th className="text-left p-2">Logged Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.employees.map((emp, empIndex) => (
                      <tr key={empIndex} className="border-b border-gray-200">
                        <td className="p-2">{emp.employee}</td>
                        <td className="p-2">{emp.budgeted.toFixed(2)}</td>
                        <td className="p-2">{emp.logged.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
      <button onClick={logout} className="mt-6 bg-red-500 text-white p-3 rounded-md hover:bg-red-600">Logout</button>
    </div>
  );
};

export default AdminDashboard;
