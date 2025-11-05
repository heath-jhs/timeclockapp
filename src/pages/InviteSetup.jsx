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

  if (loading) return <div className="p-10 text-center">Loading invite…</div>;
  if (error && !email) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Complete Your Account</h2>
        <p className="text-center"><strong>Email:</strong> {email}</p>
        <input
          placeholder="Full Name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md"
        />
        <input
          type="password"
          placeholder="Confirm"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md"
        />
        {error && <p className="text-red-600 text-center">{error}</p>}
        <button
          type="submit"
          className="w-full p-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Complete Setup
        </button>
      </form>
    </div>
  );
}
