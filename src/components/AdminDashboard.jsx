// ... existing imports ...
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import EmployeeScheduleModal from './EmployeeScheduleModal'; // NEW

export default function AdminDashboard({ user }) {
  // ... existing state ...
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const openScheduleModal = (emp) => {
    setSelectedEmployee(emp);
    setShowScheduleModal(true);
  };

  // In employee list render:
  {employees.map(emp => (
    <tr key={emp.id}>
      <td>{emp.email}</td>
      <td>{emp.name}</td>
      <td>
        <button
          onClick={() => openScheduleModal(emp)}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm mr-2"
        >
          Set Schedule
        </button>
        {/* existing assign button */}
      </td>
    </tr>
  ))}

  {showScheduleModal && (
    <EmployeeScheduleModal
      employee={selectedEmployee}
      onClose={() => setShowScheduleModal(false)}
    />
  )}
}
