const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { userId } = JSON.parse(event.body);
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing userId' }) };
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    const { error } = await supabase.auth.admin.deleteUser(userId, { should_soft_delete: true });
    if (error) {
      console.log('Delete user error details:', error);
      throw error;
    }
    return { statusCode: 200, body: JSON.stringify({ message: 'User deleted' }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message, details: error.details || 'No details' }) };
  }
};
