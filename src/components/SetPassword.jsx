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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
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
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const { error: profileError } = await supabase.from('profiles').update({ phone_number: phone, has_password: true }).eq('id', userId);
      if (profileError) throw profileError;
      navigate('/'); // Changed to '/', so App handles role-based dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Set Password</h1>
      {error && <p style={{ color: '#9b2c2c', background: '#fed7d7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</p>}
      <form onSubmit={handleSetPassword}>
        <input type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} required />
        <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} required />
        <input type="tel" placeholder="Phone Number (optional)" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <button type="submit" disabled={loading} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Setting...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;
