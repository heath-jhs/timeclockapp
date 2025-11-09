// src/components/SetPassword.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const getUserWithTimeout = () => {
    return Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), 15000))
    ]);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('SetPassword: Fetching user...');
        const { data: { user }, error: userError } = await getUserWithTimeout();
        if (userError) throw userError;
        if (!user) throw new Error('No user session');
        console.log('SetPassword: User loaded:', user.id);
        setUserId(user.id);
        window.history.replaceState({}, '', '/set-password');
      } catch (err) {
        console.error('SetPassword: fetchUser failed:', err);
        setError(err.message.includes('timeout') ? 'Connection slow. Retrying...' : err.message);
      }
    };
    fetchUser();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!userId) return setError('Session not ready');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be 6+ characters');

    setLoading(true);
    setError(null);
    try {
      console.log('SetPassword: Updating password...');
      const { error: pwdError } = await Promise.race([
        supabase.auth.updateUser({ password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('update timeout')), 30000))
      ]);
      if (pwdError) throw pwdError;

      console.log('SetPassword: Updating profile...');
      const { error: profileError } = await Promise.race([
        supabase.from('profiles').update({ phone_number: phone || null, has_password: true }).eq('id', userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('profile timeout')), 30000))
      ]);
      if (profileError) throw profileError;

      alert('Password set! Redirecting...');
      navigate('/');
    } catch (err) {
      console.error('SetPassword: Error:', err);
      setError(err.message.includes('timeout') ? 'Request timed out. Try again.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error && error.includes('No user session')) {
    return (
      <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Invalid Link</h2>
          <p style={{ margin: 0 }}>Please request a new invite from your admin.</p>
        </div>
        <button onClick={() => navigate('/')} style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none' }}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>
        Set Your Password
      </h1>
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <form onSubmit={handleSetPassword}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          required
          disabled={loading}
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 1rem 0' }}>6+ characters</p>
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          required
          disabled={loading}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          disabled={loading}
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>e.g., +15551234567</p>
        <button
          type="submit"
          disabled={loading || !userId}
          style={{ width: '100%', background: loading ? '#9ca3af' : '#22c55e', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', fontWeight: '600' }}
        >
          {loading ? 'Saving...' : 'Set Password & Continue'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;
