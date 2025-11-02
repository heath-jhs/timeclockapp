import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format, startOfDay } from 'date-fns';

export default function EmployeeHistory({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        orderBy('clockIn', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        clockIn: doc.data().clockIn?.toDate(),
        clockOut: doc.data().clockOut?.toDate()
      }));
      setRecords(data);
      setLoading(false);
    };
    fetchHistory();
  }, [user.uid]);

  const formatDuration = (start, end) => {
    if (!end) return '—';
    const ms = end - start;
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  if (loading) return <div className="p-4">Loading history...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clock History</h1>
        <a href="/" className="text-blue-600 hover:underline">← Back</a>
      </div>

      {records.length === 0 ? (
        <p>No clock records yet.</p>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="border p-4 rounded-lg">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{r.siteName}</p>
                  <p className="text-sm text-gray-600">
                    {format(r.clockIn, 'PPP')} • {format(r.clockIn, 'p')} – {r.clockOut ? format(r.clockOut, 'p') : 'Active'}
                  </p>
                </div>
                <p className="font-medium">{formatDuration(r.clockIn, r.clockOut)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
