import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthProvider';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      checkAndRedirect(user.id);
    }
  }, [user]);

  const checkAndRedirect = async (userId) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile.role === 'Admin') {
      navigate('/admin-dashboard'); // Or your admin path
    } else {
      navigate('/employee-dashboard'); // Or your employee path
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (isSignUp) {
        alert('Check your email for confirmation!');
      } else {
        await checkAndRedirect(data.user.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4"
          required
        />
        <button type="submit" disabled={loading} className="bg-blue-500 text-white p-2 w-full">
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>
      <p className="mt-4 text-center">
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 underline">
          {isSignUp ? 'Login' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};
