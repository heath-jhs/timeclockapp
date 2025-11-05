import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function Login() {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Profile auto-created by trigger — just go
        navigate('/dashboard');
      }
    });
  }, [navigate, supabase]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    await supabase.auth.signInWithOtp({ email });
    alert('Check your email for magic link!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Login</h2>
        <form onSubmit={handleMagicLink} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            className="w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Send Magic Link
          </button>
        </form>
      </div>
    </div>
  );
}
