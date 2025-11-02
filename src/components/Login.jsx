// src/components/Login.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    if (params.get('type') === 'recovery' && params.get('access_token')) {
      navigate('/reset-password');
    }
  }, [location, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    else navigate('/dashboard');
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 m-2" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 m-2" required />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>Log In</button>
      </form>
      {error && <div className="text-red-500">Error: {error}</div>}
      {loading && <div>Loading...</div>}
      <Link to="/forgot-password" className="text-blue-500">Forgot Password?</Link>
    </div>
  );
}
