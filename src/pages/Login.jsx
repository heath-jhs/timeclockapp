import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Profile auto-created by trigger — just go
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    await supabase.auth.signInWithOtp({ email });
    alert('Check your email for magic link!');
  };

  return (
    <form onSubmit={handleMagicLink}>
      <input type="email" name="email" placeholder="your@email.com" required />
      <button type="submit">Send Magic Link</button>
    </form>
  );
}
