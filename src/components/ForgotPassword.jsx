// src/components/ForgotPassword.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://funny-dolphin-a34226.netlify.app/reset-password' });
    if (resetError) setError(resetError.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) return <div>Reset link sent! Check your email.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <form onSubmit={handleForgotPassword}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 m-2" required />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>Send Reset Link</button>
      </form>
      {error && <div className="text-red-500">Error: {error}</div>}
      {loading && <div>Loading...</div>}
      <Link to="/" className="text-blue-500">Back to Login</Link>
    </div>
  );
}
