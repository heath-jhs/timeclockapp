// src/components/Auth.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const navigate = useNavigate();

  // AUTO-REDIRECT IF LOGGED IN
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/clockin', { replace: true });
      }
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/clockin', { replace: true });
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, [navigate]);

  // MAGIC LINK ONLY
  const handleMagicLink = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/clockin' },
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Magic link sent! Check your email.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
      <div className="text-center mb-6">
        <div className="inline-block p-3 bg-blue-100 rounded-full">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mt-2">Time Clock Login</h1>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Send Magic Link
        </button>
      </form>
    </div>
  );
}
