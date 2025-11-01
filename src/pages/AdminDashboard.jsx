import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSite, setSelectedSite] = useState('');

  useEffect(() => {
    // Load employees (from profiles)
    supabase.from('profiles').select('id, full_name').then(({ data }) => setEmployees(data || []));
    // Load sites
    supabase.from('sites').select('id, name').then(({ data }) => setSites(data || []));
  }, []);

  const assignJob = async () => {
    if (!selectedEmployee || !selectedSite) return;

    const { error } = await supabase
      .from('employee_sites')
      .upsert({ employee_id: selectedEmployee, site_id: selectedSite }, { onConflict: 'employee_id' });

    if (error) alert('Error: ' + error.message);
    else alert('Job assigned!');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin: Assign Jobs</h1>

      <div className="space-y-4">
        <select
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.full_name || emp.id}</option>
          ))}
        </select>

        <select
          value={selectedSite}
          onChange={e => setSelectedSite(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Site</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>

        <button
          onClick={assignJob}
          className="w-full py-2 bg-blue-600 text-white rounded"
        >
          Assign Job
        </button>
      </div>
    </div>
  );
}
