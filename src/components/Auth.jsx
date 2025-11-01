// MAGIC LINK ONLY — NO PIN — 2025-11-01
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // CHANGE IF YOUR PATH IS DIFFERENT

export default function Auth() {
  const navigate = useNavigate();

  // AUTO REDIRECT IF LOGGED IN
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/clockin', { replace: true });
    };
    check();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') navigate('/clockin', { replace: true });
    });

    return () => listener?.subscription?.unsubscribe();
  }, [navigate]);

  // MAGIC LINK FORM
  const sendLink = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) alert('Error: ' + error.message);
    else alert('Magic link sent! Check email.');
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow text-center">
      <h1 className="text-2xl font-bold mb-6">Time Clock Login</h1>
      <form onSubmit={sendLink} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          className="w-full px-4 py-2 border rounded"
          required
        />
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded">
          Send Magic Link
        </button>
      </form>
    </div>
  );
}
