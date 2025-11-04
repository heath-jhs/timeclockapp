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
      ({ data, error } = await adminAuthClient.inviteUserByEmail(email, {
        data: { role: isAdmin ? 'Admin' : 'Employee' },
      }));
    }

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify(data.user || data) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
