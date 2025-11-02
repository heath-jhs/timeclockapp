// src/components/Login.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/';
      }
    };
    checkSession();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignup && !fullName.trim()) {
      setMessage('Full name required');
      setLoading(false);
      return;
    }

    if (isSignup) {
      // SIGN UP + SEND CONFIRMATION
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: 'https://funny-dolphin-a34226.netlify.app',
        },
      });
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email! Click the link to confirm.');
        setIsSignup(false);
        setFullName('');
        setPassword('');
      }
    } else {
      // LOG IN (only after confirmation)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(`Error: ${error.message} (Did you confirm your email?)`);
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'https://funny-dolphin-a34226.netlify.app' },
    });
    if (error) setMessage(`Error: ${error.message}`);
    else setMessage('Confirmation email resent!');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-blue-600">
          Time Clock
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignup && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}

          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setMessage('');
              setFullName('');
              setPassword('');
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            {isSignup ? 'Log In' : 'Sign Up'}
          </button>
        </p>

        {message && (
          <p
            className={`mt-4 text-center text-sm ${
              message.startsWith('Error') ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}

        {message.includes('Check your email') && (
          <button
            onClick={handleResend}
            disabled={loading}
            className="mt-2 block w-full text-center text-blue-600 hover:underline text-sm"
          >
            Resend confirmation email
          </button>
        )}
      </div>
    </div>
  );
}
