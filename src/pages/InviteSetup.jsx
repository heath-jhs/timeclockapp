// src/pages/InviteSetup.jsx
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function InviteSetup() {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return setError('Invalid invite link'), setLoading(false);

    // Validate token using Supabase Auth invite flow
    supabase.auth.getUser(token).then(({ data, error }) => {
      if (error || !data.user) {
        setError('Invalid or expired invite');
      } else {
        setEmail(data.user.email);
        setFullName(data.user.user_metadata.full_name || '');
      }
      setLoading(false);
    });
  }, [token, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (!fullName) return setError('Name required');

    const { error } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName }
    });

    if (error) return setError(error.message);

    navigate('/employee');
  };

  if (loading) return <div style={{ padding: 40 }}>Loading invite…</div>;
  if (error && !email) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '60px auto', padding: 20 }}>
      <h2>Complete Your Account</h2>
      <p><strong>Email:</strong> {email}</p>
      <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: 10, marginBottom: 12 }} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 10, marginBottom: 12 }} />
      <input type="password" placeholder="Confirm" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: '100%', padding: 10, marginBottom: 12 }} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" style={{ width: '100%', padding: 12, background: '#10b981', color: 'white', border: 'none', borderRadius: 6 }}>
        Complete Setup
      </button>
    </form>
  );
}
