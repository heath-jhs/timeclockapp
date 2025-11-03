import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { useAuth } from './AuthProvider';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4">Loading...</div>;
  return user ? children : <Navigate to="/" />;
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
