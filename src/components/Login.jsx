// src/components/Login.jsx
import { useState } from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) setMessage('Error: ' + error.message);
    else setMessage('Check your email for magic link!');
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Time Clock Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded mb-4"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
