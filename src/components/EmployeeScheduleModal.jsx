import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function EmployeeScheduleModal({ employee, onClose }) {
  const [schedule, setSchedule] = useState(
    employee.trackingSchedule || days.reduce((acc, d) => ({
      ...acc, [d]: { enabled: d === 'mon' ? true : false, start: '07:00', end: '18:00' }
    }), {})
  );

  const handleSave = async () => {
    await supabase.from('users').update({ trackingSchedule: schedule }).eq('id', employee.id);
    onClose();
  };

  const toggleDay = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const updateTime = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Tracking Schedule: {employee.email}</h2>
        <div className="space-y-3">
          {days.map(day => (
            <div key={day} className="flex items-center space-x-3">
              <input type="checkbox" checked={schedule[day].enabled} onChange={() => toggleDay(day)} className="w-5 h-5" />
              <span className="w-12 capitalize">{day}</span>
              <input type="time" value={schedule[day].start} onChange={e => updateTime(day, 'start', e.target.value)} disabled={!schedule[day].enabled} className="border rounded px-2 py-1" />
              <span>to</span>
              <input type="time" value={schedule[day].end} onChange={e => updateTime(day, 'end', e.target.value)} disabled={!schedule[day].enabled} className="border rounded px-2 py-1" />
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}
