const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { userId, siteIds } = JSON.parse(event.body);
  if (!userId || !Array.isArray(siteIds)) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing userId or siteIds array' }) };
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Delete existing assignments for user
    const { error: delError } = await supabase.from('employee_sites').delete().eq('employee_id', userId);
    if (delError) throw delError;
    // Insert new assignments
    if (siteIds.length > 0) {
      const inserts = siteIds.map(siteId => ({ employee_id: userId, site_id: siteId }));
      const { error: insError } = await supabase.from('employee_sites').insert(inserts);
      if (insError) throw insError;
    }
    return { statusCode: 200, body: JSON.stringify({ message: 'Sites assigned' }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
