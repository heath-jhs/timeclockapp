import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
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
  const [newEmployeeRole, setNewEmployeeRole] = useState('Employee');
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
  const [reportStart, setReportStart] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [reportEnd, setReportEnd] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  });
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [timeEntriesPage, setTimeEntriesPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const itemsPerPage = 10;
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
    const fetchCurrentRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (error) {
          console.error('Role fetch error:', error);
          setError('Failed to fetch user role');
          return;
        }
        console.log('Current user role:', profile.role); // Debug log
        setCurrentUserRole(profile.role);
      }
    };
    fetchCurrentRole();
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
      const sorted = data.sort((a, b) => {
        const order = { Admin: 0, Manager: 1, Employee: 2 };
        return order[a.role] - order[b.role];
      });
      setEmployees(sorted);
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
        .select('*, employee:employee_id ( username, full_name, work_hours, daily_start, daily_end ), site:site_id ( name )')
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
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };
  const debouncedUpdateProfile = useCallback(debounce(async (id, field, value) => {
    try {
      const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }, 500), []);
  const addEmployee = async () => {
    setLoadingEmployee(true);
    try {
      const response = await fetch('/.netlify/functions/add-user', {
        method: 'POST',
        body: JSON.stringify({ email: newEmployeeEmail, name: newEmployeeName, role: newEmployeeRole }),
      });
      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || 'Failed to add user');
      }
      setNewEmployeeEmail('');
      setNewEmployeeName('');
      setNewEmployeeRole('Employee');
      setError(null);
      setSuccess('Employee added successfully');
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEmployee(false);
    }
  };
  const deleteEmployee = async (id) => {
    if (!window.confirm('Confirm delete employee?')) return;
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
    setLoadingSite(true);
    if (!newSiteName || !newSiteAddress) {
      setError('Please provide both site name and address');
      setLoadingSite(false);
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
    } finally {
      setLoadingSite(false);
    }
  };
  const deleteSite = async (id) => {
    if (!window.confirm('Confirm delete site? This will remove associated assignments.')) return;
    try {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Site deleted successfully');
      setError(null);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };
  const assignSites = async () => {
    setLoadingAssign(true);
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
    } finally {
      setLoadingAssign(false);
    }
  };
  const deleteAssignment = async (id) => {
    if (!window.confirm('Confirm delete assignment?')) return;
    try {
      const { error } = await supabase.from('employee_sites').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Assignment deleted successfully');
      setError(null);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };
  const calculateDuration = (assign) => {
    const startDate = new Date(assign.start_date || new Date().toISOString());
    const endDate = new Date(assign.end_date || new Date().toISOString());
    if (startDate > endDate) return '0.00 hours';
    const employee = assign.employee;
    const dailyHours = employee.work_hours || 8;
    const dailyStart = employee.daily_start ? parseInt(employee.daily_start.split(':')[0]) : 9;
    const dailyEnd = employee.daily_end ? parseInt(employee.daily_end.split(':')[0]) : 17;
    let totalHours = 0;
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayStart = new Date(current);
      dayStart.setHours(dailyStart, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(dailyEnd, 0, 0, 0);
      const effStart = new Date(Math.max(startDate, dayStart));
      const effEnd = new Date(Math.min(endDate, dayEnd));
      if (effStart < effEnd) {
        totalHours += (effEnd - effStart) / (1000 * 60 * 60);
      }
      current.setDate(current.getDate() + 1);
    }
    return Math.min(totalHours, dailyHours * Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))).toFixed(2) + ' hours';
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
  // Memoized report calculations
  const getWorkedHours = useMemo(() => (employeeId, siteId, startDate, endDate) => {
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
  }, [timeEntries]);
  const getBudgetedHours = useMemo(() => (employee, assignment, startDate, endDate) => {
    const assignStart = new Date(assignment.start_date || startDate);
    const assignEnd = new Date(assignment.end_date || endDate);
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const overlapStart = new Date(Math.max(assignStart, periodStart));
    const overlapEnd = new Date(Math.min(assignEnd, periodEnd));
    if (overlapStart > overlapEnd) return 0;
    const dailyHours = employee.work_hours || 8;
    const dailyStartHour = employee.daily_start ? parseInt(employee.daily_start.split(':')[0]) : 9;
    const dailyEndHour = employee.daily_end ? parseInt(employee.daily_end.split(':')[0]) : 17;
    let totalHours = 0;
    let current = new Date(overlapStart);
    current.setHours(0, 0, 0, 0); // Start at beginning of day
    while (current <= overlapEnd) {
      const dayStart = new Date(current);
      dayStart.setHours(dailyStartHour, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(dailyEndHour, 0, 0, 0);
      const effStart = new Date(Math.max(overlapStart, dayStart));
      const effEnd = new Date(Math.min(overlapEnd, dayEnd));
      if (effStart < effEnd) {
        totalHours += (effEnd - effStart) / (1000 * 60 * 60);
      }
      current.setDate(current.getDate() + 1);
    }
    return Math.min(totalHours, dailyHours * Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)));
  }, []);
  const getEfficiencyData = useMemo(() => (employeeId) => {
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
  }, [assignments, employees, getWorkedHours, getBudgetedHours, reportStart, reportEnd]);
  const comparisonData = useMemo(() => employees.flatMap(emp => {
    return assignments.filter(a => a.employee_id === emp.id).map(a => {
      const worked = getWorkedHours(emp.id, a.site_id, reportStart, reportEnd);
      const scheduled = getBudgetedHours(emp, a, reportStart, reportEnd);
      const variance = worked - scheduled;
      const efficiency = scheduled > 0 ? (worked / scheduled * 100).toFixed(2) : 0;
      return { employee: emp.full_name || emp.username, site: a.site.name, worked, scheduled, variance, efficiency };
    });
  }), [employees, assignments, getWorkedHours, getBudgetedHours, reportStart, reportEnd]);
  const payrollData = useMemo(() => sites.map(site => {
    const siteAssignments = assignments.filter(a => a.site_id === site.id);
    const siteEmployees = siteAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (!emp) return null;
      const budgeted = getBudgetedHours(emp, a, reportStart, reportEnd);
      const logged = getWorkedHours(emp.id, site.id, reportStart, reportEnd);
      return { employee: emp.full_name || emp.username, budgeted, logged };
    }).filter(Boolean);
    return { site: site.name, employees: siteEmployees };
  }).filter(group => group.employees.length > 0), [sites, assignments, employees, getBudgetedHours, getWorkedHours, reportStart, reportEnd]);
  const exportToExcel = (data, fileName, sheetName, headers) => {
    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
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
    XLSX.writeFile(wb, 'timelines.xlsx');
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
    XLSX.writeFile(wb, 'payroll.xlsx');
  };
  const viewEmployeeDashboard = (id) => {
    window.open(`/employee-dashboard/${id}`, '_blank');
  };
  const paginatedTimeEntries = timeEntries.slice((timeEntriesPage - 1) * itemsPerPage, timeEntriesPage * itemsPerPage);
  const paginatedAssignments = assignments.slice((assignmentsPage - 1) * itemsPerPage, assignmentsPage * itemsPerPage);
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
        {/* ... (rest of the add sections unchanged) ... */}
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Employee Assignments</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* ... thead unchanged ... */}
          <tbody>
            {paginatedAssignments.map((assign, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {/* ... row content unchanged ... */}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button disabled={assignmentsPage === 1} onClick={() => setAssignmentsPage(prev => prev - 1)} style={{ marginRight: '1rem' }}>Prev</button>
          <button disabled={assignmentsPage * itemsPerPage >= assignments.length} onClick={() => setAssignmentsPage(prev => prev + 1)}>Next</button>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Time Entries</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* ... thead unchanged ... */}
          <tbody>
            {paginatedTimeEntries.map((entry, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {/* ... row content unchanged ... */}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button disabled={timeEntriesPage === 1} onClick={() => setTimeEntriesPage(prev => prev - 1)} style={{ marginRight: '1rem' }}>Prev</button>
          <button disabled={timeEntriesPage * itemsPerPage >= timeEntries.length} onClick={() => setTimeEntriesPage(prev => prev + 1)}>Next</button>
        </div>
      </div>
      {/* ... other sections unchanged ... */}
      <button onClick={logout} style={{ background: '#f56565', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', marginTop: '1.5rem' }}>Logout</button>
    </div>
  );
};
export default AdminDashboard;
