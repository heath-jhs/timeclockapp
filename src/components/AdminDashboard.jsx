import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import EmployeeScheduleModal from './EmployeeScheduleModal';

export default function AdminDashboard({ user }) {
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteLat, setNewSiteLat] = useState('');
  const [newSiteLng, setNewSiteLng] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  // Load sites
  useEffect(() => {
    const fetchSites = async () => {
      const { data } = await supabase.from('sites').select('*');
      setSites(data || []);
    };
    fetchSites();

    const channel = supabase.channel('sites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, fetchSites)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'employee');
      setEmployees(data || []);
    };
    fetchEmployees();

    const channel = supabase.channel('users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'role=eq.employee' }, fetchEmployees)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const addSite = async () => {
    if (!newSiteName || !newSiteAddress || !newSiteLat || !newSiteLng) return;
    await supabase.from('sites').insert({
      name: newSiteName,
      address: newSiteAddress,
      location: { lat: parseFloat(newSiteLat), lng: parseFloat(newSiteLng) },
      assignedEmployees: []
    });
    setNewSiteName('');
    setNewSiteAddress('');
    setNewSiteLat('');
    setNewSiteLng('');
  };

  const assignEmployee = async () => {
    if (!selectedSite || !selectedEmployee) return;
    const site = sites.find(s => s.id === selectedSite);
    const updated = [...new Set([...(site.assignedEmployees || []), selectedEmployee])];
    await supabase.from('sites').update({ assignedEmployees: updated }).eq('id', selectedSite);
    setSelectedEmployee('');
  };

  const openScheduleModal = (emp) => {
    setModalEmployee(emp);
    setShowScheduleModal(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Add Site */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Site</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            placeholder="Name"
            value={newSiteName}
            onChange={e => setNewSiteName(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            placeholder="Address"
            value={newSiteAddress}
            onChange={e => setNewSiteAddress(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            placeholder="Latitude"
            value={newSiteLat}
            onChange={e => setNewSiteLat(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            placeholder="Longitude"
            value={newSiteLng}
            onChange={e => setNewSiteLng(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
        <button onClick={addSite} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Add Site
        </button>
      </div>

      {/* Assign Employee */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Assign Employee to Site</h2>
        <div className="flex gap-4 mb-4">
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="p-2 border rounded flex-1">
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="p-2 border rounded flex-1">
            <option value="">Select Employee</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.email}</option>)}
          </select>
          <button onClick={assignEmployee} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Assign
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Employees</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b">
                <td className="py-2">{emp.email}</td>
                <td className="py-2">{emp.name || '-'}</td>
                <td className="py-2">
                  <button
                    onClick={() => openScheduleModal(emp)}
                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm mr-2 hover:bg-purple-700"
                  >
                    Set Schedule
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showScheduleModal && (
        <EmployeeScheduleModal
          employee={modalEmployee}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}
