import React, { useState } from 'react';
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
if (user) navigate('/dashboard');
const handleAuth = async (e) => {
e.preventDefault();
setLoading(true);
setError('');
try {
let { error } = isSignUp
? await supabase.auth.signUp({ email, password })
: await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
if (isSignUp) alert('Check your email for confirmation!');
if (!isSignUp) navigate('/dashboard');
} catch (err) {
setError(err.message);
} finally {
setLoading(false);
}
};
return (
    
      {isSignUp ? 'Sign Up' : 'Login'}
      {error && {error}}
      
         setEmail(e.target.value)}
          className="border p-2 w-full mb-2"
          required
        />
         setPassword(e.target.value)}
          className="border p-2 w-full mb-4"
          required
        />
        <button type="submit" disabled="{loading}" class="bg-blue-500 text-white p-2 w-full">
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
        </button>
      
      
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <button onclick="{()" &#x3D;=""> setIsSignUp(!isSignUp)} className="text-blue-500 underline">
          {isSignUp ? 'Login' : 'Sign Up'}
        </button>
      
    
  );
};
export default Auth;
