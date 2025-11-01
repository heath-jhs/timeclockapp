import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function AdminDashboard() {
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showAddSite, setShowAddSite] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedWeek]);

  const fetchData = async () => {
    const { data: siteData } = await supabase.from('sites').select('*');
    const { data: empData } = await supabase.from('profiles').select('*').eq('role', 'employee');
    const start = startOfWeek(selectedWeek);
    const end = endOfWeek(selectedWeek);
    const { data: logData } = await supabase
      .from('time_logs')
      .select('*, profiles(full_name), sites(name)')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    setSites(siteData || []);
    setEmployees(empData || []);
    setLogs(logData || []);
  };

  const exportCSV = () => {
    const csvData = logs.map(log => ({
      Employee: log.profiles?.full_name || 'Unknown',
      Site: log.sites?.name || 'Unknown',
      Type: log.type === 'in' ? 'Clock In' : 'Clock Out',
      Time: format(new Date(log.timestamp), 'MM/dd/yyyy HH:mm'),
      Hours: '' // Calculated in payroll system
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-week-${format(selectedWeek, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4 shadow">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm underline"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowAddSite(true)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-800"
          >
            Add Site
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Schedule Employee
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            Export Payroll CSV
          </button>
        </div>

        {/* Sites List */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Sites</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sites.map(site => (
              <div key={site.id} className="border p-3 rounded">
                <p className="font-medium">{site.name}</p>
                <p className="text-sm text-gray-600">{site.address}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Report */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">
            Week of {format(startOfWeek(selectedWeek), 'MMM d, yyyy')}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Employee</th>
                <th className="text-left py-2">Site</th>
                <th className="text-left py-2">In</th>
                <th className="text-left py-2">Out</th>
              </tr>
            </thead>
            <tbody>
              {logs.filter(l => l.type === 'in').map(inLog => {
                const outLog = logs.find(l => l.type === 'out' && l.site_id === inLog.site_id && l.user_id === inLog.user_id && new Date(l.timestamp) > new Date(inLog.timestamp));
                return (
                  <tr key={inLog.id} className="border-b">
                    <td>{inLog.profiles?.full_name}</td>
                    <td>{inLog.sites?.name}</td>
                    <td>{format(new Date(in
