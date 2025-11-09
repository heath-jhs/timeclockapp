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
        console.log('Fetching user for set password...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('getUser error:', userError);
          setError('Failed to get user: ' + userError.message);
          return;
        }
        if (user) {
          console.log('User fetched:', user.email);
          setUserId(user.id);
          window.history.replaceState({}, '', '/set-password');
        } else {
          setError('No authenticated user — invite link invalid');
        }
      } catch (err) {
        console.error('Fetch user failed:', err);
        setError('Error loading user: ' + err.message);
      }
    };
    fetchUser();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('Updating password...');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        console.error('updateUser error:', updateError);
        throw updateError;
      }
      console.log('Password updated');

      console.log('Updating profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone_number: phone, has_password: true })
        .eq('id', userId);
      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }
      console.log('Profile updated');

      navigate('/');
    } catch (err) {
      setError(err.message || 'Unknown error');
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
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          required
        />
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
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
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
