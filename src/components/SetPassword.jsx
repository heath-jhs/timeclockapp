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
        console.log('SetPassword: Fetching user session...');
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUser() timed out after 30s')), 30000)
        );
        const { data: { user }, error: userError } = await Promise.race([getUserPromise, timeoutPromise]);
        
        if (userError) {
          console.error('SetPassword: getUser error:', userError);
          throw userError;
        }
        if (!user) {
          console.warn('SetPassword: No user found in session');
          setError('Invalid or expired invite link. Please request a new invite.');
          return;
        }

        console.log('SetPassword: User loaded:', user.id, user.email);
        setUserId(user.id);

        // Clear any hash from URL
        if (window.location.hash) {
          window.history.replaceState({}, '', '/set-password');
        }

      } catch (err) {
        console.error('SetPassword: fetchUser failed:', err);
        setError(err.message.includes('timed out') 
          ? 'Connection timeout. Check your network and try again.' 
          : err.message || 'Failed to load user session'
        );
      }
    };
    fetchUser();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError('User session not loaded. Please refresh the page.');
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
    setError(null);

    try {
      console.log('SetPassword: Updating password for user:', userId);
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('updateUser() timed out')), 30000)
      );
      const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]);
      if (updateError) {
        console.error('SetPassword: updateUser error:', updateError);
        throw updateError;
      }
      console.log('SetPassword: Password updated successfully');

      console.log('SetPassword: Updating profile with phone and has_password...');
      const profilePromise = supabase
        .from('profiles')
        .update({ 
          phone_number: phone || null, 
          has_password: true 
        })
        .eq('id', userId);
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile update timed out')), 30000)
      );
      const { error: profileError } = await Promise.race([profilePromise, profileTimeout]);
      if (profileError) {
        console.error('SetPassword: profile update error:', profileError);
        throw profileError;
      }
      console.log('SetPassword: Profile updated');

      // Success - redirect
      alert('Password set successfully! Redirecting to login...');
      navigate('/');

    } catch (err) {
      console.error('SetPassword: handleSetPassword error:', err);
      const msg = err.message || 'Unknown error';
      setError(
        msg.includes('timed out') ? 'Request timed out. Please try again.' :
        msg.includes('Invalid') ? 'Invalid or expired session. Please use a fresh invite link.' :
        msg.includes('rate limit') ? 'Too many attempts. Please wait a moment and try again.' :
        msg
      );
    } finally {
      setLoading(false);
    }
  };

  if (error && error.includes('Invalid or expired')) {
    return (
      <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Link Expired or Invalid</h2>
          <p style={{ margin: 0 }}>This invite link is no longer valid. Please ask your administrator to send a new invite.</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>
        Set Your Password
      </h1>

      {error && (
        <div style={{ 
          background: '#fee2e2', 
          color: '#991b1b', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem',
          border: '1px solid #fca5a5',
          fontSize: '0.875rem'
        }}>
          <strong>Error:</strong> {error}
          {error.includes('timed out') && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.9 }}>
              Try refreshing the page or checking your internet connection.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSetPassword}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.375rem',
              fontSize: '1rem'
            }}
            required
            disabled={loading}
          />
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Must be at least 6 characters
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.375rem',
              fontSize: '1rem'
            }}
            required
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="tel"
            placeholder="Phone Number (optional)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.375rem',
              fontSize: '1rem'
            }}
            disabled={loading}
          />
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            e.g., +15551234567
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !userId}
          style={{ 
            width: '100%', 
            background: loading ? '#9ca3af' : '#22c55e', 
            color: 'white', 
            padding: '0.75rem', 
            borderRadius: '0.375rem', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Saving...' : 'Set Password & Continue'}
        </button>
      </form>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Please wait while we secure your account...
        </div>
      )}
    </div>
  );
};

export default SetPassword;
