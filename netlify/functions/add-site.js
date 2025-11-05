const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { name } = JSON.parse(event.body);
  if (!name) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing name' }) };
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('sites').insert({ name }).select();
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify(data[0]) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
