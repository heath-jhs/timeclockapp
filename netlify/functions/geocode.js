const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { address } = event.queryStringParameters;
    if (!address) return { statusCode: 400, body: 'Missing address' };
    const key = process.env.GOOGLE_MAPS_KEY;  // Secure in Netlify env
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: error.message || 'Server error' };
  }
};
