const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    const { data: { users } } = await supabase.auth.admin.listUsers();
    return {
      statusCode: 200,
      body: JSON.stringify(users.map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata || {} }))),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
