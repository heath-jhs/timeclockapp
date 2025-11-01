// src/components/AssignSites.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AssignSites() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, avatar_url').then(({ data }) => setEmployees(data || []));
    supabase.from('sites').select('id, name').then(({ data }) => setSites(data || []));
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

  const handleAvatarUpload = async (employeeId, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [employeeId]: true }));

    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', employeeId);
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, avatar_url: publicUrl } : e));
    }
    setUploading(prev => ({ ...prev, [employeeId]: false }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Assign Sites & Upload Photos</h2>
      <div className="space-y-4">
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              {emp.avatar_url ? (
                <img src={emp.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm">?</div>
              )}
              <div>
                <p className="font-medium">{emp.full_name}</p>
                <label className="text-xs text-blue-600 cursor-pointer hover:underline">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(emp.id, e.target.files[0])}
                    className="hidden"
                    disabled={uploading[emp.id]}
                  />
                </label>
                {uploading[emp.id] && <span className="text-xs text-gray-500 ml-2">Uploading...</span>}
              </div>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
