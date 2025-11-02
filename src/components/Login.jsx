// src/components/Login.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) window.location.href = '/';
    };
    checkSession();

    // Handle recovery token from URL
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const type = params.get('type');
      const accessToken = params.get('access_token');
      if (type === 'recovery' && accessToken) {
        setIsReset(true);
        setResetToken(accessToken);
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isReset && resetToken) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setMessage(`Error: ${error.message}`);
      else {
        setMessage('Password updated! Log in now.');
        setIsReset(false);
        setResetToken(null);
      }
      setLoading(false);
      return;
    }

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://funny-dolphin-a34226.netlify.app',
      });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage('Check your email for reset link!');
      setLoading(false);
      return;
    }

    if (isSignup && !fullName.trim()) {
      setMessage('Full name required');
      setLoading(false);
      return;
    }

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: 'https://funny-dolphin-a34226.netlify.app',
        },
      });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage('Check your email! Click the link to verify.');
      setIsSignup(false);
      setFullName('');
      setPassword('');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(`Error: ${error.message}`);
      else window.location.href = '/';
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

          {(!isReset || !resetToken) && (
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}

          <input
            type="password"
            placeholder={resetToken ? 'New Password (6+ characters)' : 'Password (6+ characters)'}
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
            {loading ? 'Processing...' : resetToken ? 'Reset Password' : isReset ? 'Send Reset Link' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {resetToken ? 'Back to Log In' : isReset ? 'Back to Log In' : isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsReset(false);
              setIsSignup(!isSignup);
              setMessage('');
              setFullName('');
              setPassword('');
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            {resetToken ? 'Log In' : isReset ? 'Log In' : isSignup ? 'Log In' : 'Sign Up'}
          </button>
        </p>

        {!isSignup && !isReset && !resetToken && (
          <button
            type="button"
            onClick={() => setIsReset(true)}
            className="mt-2 block w-full text-center text-blue-600 hover:underline text-sm"
          >
            Forgot Password?
          </button>
        )}

        {message && (
          <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        {message.includes('Check your email') && !isReset && (
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
