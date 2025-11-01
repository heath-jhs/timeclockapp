// src/components/AssignSites.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AssignSites() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    // Load employees
    supabase.from('profiles').select('id, full_name').then(({ data }) => setEmployees(data || []));
    // Load sites
    supabase.from('sites').select('id, name').then(({ data }) => setSites(data || []));
    // Load current assignments
    supabase.from('employee_sites').select('*').then(({ data }) => {
      const map = {};
      data?.forEach(a => map[a.employee_id] = a.site_id);
      setAssignments(map);
    });
  }, []);

  const updateAssignment = async (employeeId, siteId) => {
    const current = assignments[employeeId];
    if (current === siteId) return;

    if (current) {
      await supabase.from('employee_sites').delete().eq('employee_id', employeeId);
    }
    if (siteId) {
      await supabase.from('employee_sites').insert({ employee_id: employeeId, site_id: siteId });
    }
    setAssignments(prev => ({ ...prev, [employeeId]: siteId }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Assign Sites to Employees</h2>
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Employee</th>
            <th className="px-4 py-2 text-left">Assigned Site</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td className="px-4 py-2 border-b">{emp.full_name}</td>
              <td className="px-4 py-2 border-b">
                <select
                  value={assignments[emp.id] || ''}
                  onChange={(e) => updateAssignment(emp.id, e.target.value || null)}
                  className="p-2 border rounded"
                >
                  <option value="">None</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
