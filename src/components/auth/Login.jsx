// src/components/auth/Login.jsx
import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const [view, setView] = useState('sign_in'); // 'sign_in' or 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login?reset=true',
    });

    if (error) setError(error.message);
    else setError('Check your email for the reset link!');
    setLoading(false);
  };

  if (view === 'reset') {
    return (
      <div style={{ maxWidth: 360, margin: '60px auto', padding: 20, fontFamily: 'system-ui' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Reset Password</h2>
        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 16 }}
          />
          {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 12,
            }}
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={() => setView('sign_in')}
            style={{
              width: '100%',
              padding: 12,
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: '60px auto', padding: 20, fontFamily: 'system-ui' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Employee Login</h2>
      <form onSubmit={handleSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 16 }}
        />
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12,
          }}
        >
          {loading ? 'Signing in…' : 'Log In'}
        </button>
        <button
          type="button"
          onClick={() => setView('reset')}
          style={{
            width: '100%',
            padding: 12,
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
          }}
        >
          Forgot Password?
        </button>
      </form>
    </div>
  );
}
