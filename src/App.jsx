import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthProvider'; // Assumes in src/
import Auth from './components/Auth'; // Assumes in src/components/
import AdminDashboard from './components/AdminDashboard'; // Assumes in src/components/
import { useAuth } from './AuthProvider';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4">Loading dashboard...</div>;
  if (!user) return <Navigate to="/" />;
  console.log('Auth user:', user); // Debug to confirm auth
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          {/* Add other routes as needed, e.g., employee dashboard */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
