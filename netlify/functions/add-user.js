const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { email, password, isAdmin } = JSON.parse(event.body);
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing email or password' }) };
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: isAdmin ? 'Admin' : 'Employee' } },
    });
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify(data.user) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
