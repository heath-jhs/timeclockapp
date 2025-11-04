const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, isAdmin } = JSON.parse(event.body);

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing email' }) };
  }

  try {
    console.log('Initializing Supabase with URL:', process.env.SUPABASE_URL); // Debug env
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminAuthClient = supabase.auth.admin;

    let data, error;
    if (password) {
      // Fallback to createUser with password if provided (for legacy or testing)
      ({ data, error } = await adminAuthClient.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: isAdmin ? 'Admin' : 'Employee' },
      }));
    } else {
      // Use invite for passwordless
      console.log('Inviting user:', email); // Debug invite start
      ({ data, error } = await adminAuthClient.inviteUserByEmail(email, {
        data: { role: isAdmin ? 'Admin' : 'Employee' },
      }));
    }

    if (error) {
      console.error('Supabase error:', error); // Log full error
      let message = error.message;
      if (error.code === 'over_email_send_rate_limit') message = 'Email send rate limit exceeded—try again later';
      if (error.code === 'user_already_exists') message = 'User already exists';
      if (error.status === 403) message = 'Invalid service role key—check env vars';
      throw new Error(message);
    }
    console.log('User added successfully:', data); // Debug success
    return { statusCode: 200, body: JSON.stringify(data.user || data) };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
