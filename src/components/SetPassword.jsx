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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('Fetching user...');
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Get user timeout')), 30000));
        const { data: { user }, error: userError } = await Promise.race([getUserPromise, timeoutPromise]);
        if (userError) throw userError;
        console.log('User fetched:', user ? user.email : 'No user');
        if (user) {
          setUserId(user.id);
          window.history.replaceState({}, '', '/set-password');
        } else {
          setError('No user — invalid link');
        }
      } catch (err) {
        console.error('Fetch user error:', err);
        setError(err.message || 'Timeout - try again');
      }
    };
    fetchUser();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError('User not loaded – refresh page');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      console.log('Updating user password...');
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Update timeout')), 30000));
      const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]);
      if (updateError) throw updateError;
      console.log('Password updated');

      console.log('Updating profile...');
      const profilePromise = supabase
        .from('profiles')
        .update({ phone_number: phone, has_password: true })
        .eq('id', userId);
      const profileTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile timeout')), 30000));
      const { error: profileError } = await Promise.race([profilePromise, profileTimeout]);
      if (profileError) throw profileError;
      console.log('Profile updated');

      navigate('/');
    } catch (err) {
      console.error('Set password error:', err);
      setError(err.message || 'Timeout - please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>Set Password</h1>
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSetPassword}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          required
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Password must be at least 6 characters.</p>
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number (optional)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>e.g., +1234567890</p>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', background: '#22c55e', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Setting...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;
