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
    // Prevent self-delete if userId is current (though admin is calling, better safe)
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.user?.id === userId) {
      throw new Error('Cannot delete logged-in user');
    }
    // Force signout all sessions
    const { data: sessions, error: sessionsError } = await supabase.auth.admin.listSessions(userId);
    if (sessionsError) throw sessionsError;
    for (const session of sessions.sessions || []) {
      await supabase.auth.signOut({ scope: 'global', access_token: session.access_token });
    }
    const { error } = await supabase.auth.admin.deleteUser(userId);
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
