const { createClient } = require('@supabase/supabase-js');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { email, name, role } = JSON.parse(event.body); 
  if (!email || !name || !role) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Email, name, and role are required' }) };
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminAuthClient = supabase.auth.admin;
    const { data: inviteData, error: inviteError } = await adminAuthClient.inviteUserByEmail(email, {
      data: { full_name: name },
    });
    if (inviteError) {
      let message = inviteError.message;
      if (inviteError.code === 'over_email_send_rate_limit') message = 'Email send rate limit exceeded—try again later';
      if (inviteError.code === 'user_already_exists') message = 'User already exists';
      if (inviteError.status === 403) message = 'Invalid service role key—check env vars';
      throw new Error(message);
    }
    const userId = inviteData.user.id;
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      username: email,
      role,
      full_name: name,
    }, { onConflict: 'id' });
    if (profileError) throw profileError;
    return { statusCode: 200, body: JSON.stringify({ message: 'User invited successfully' }) };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
