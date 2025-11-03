// src/components/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (type === 'recovery' && accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).catch(err => setError(err.message || 'Error setting session'));
    } else {
      setError('Invalid recovery link');
    }
  }, [location]);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000); // Redirect to login after 3s
    } catch (err) {
      setError(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (success) return <div>Password reset! Redirecting to login...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <form onSubmit={handleReset}>
        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border p-2 m-2" required />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>Reset</button>
      </form>
      {loading && <div>Loading...</div>}
    </div>
  );
}
