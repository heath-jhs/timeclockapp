exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { address } = JSON.parse(event.body);
    if (!address) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing address in request' }) };
    }

    const apiKey = process.env.GOOGLE_MAPS_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing Google Maps API key' }) };
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return { statusCode: 400, body: JSON.stringify({ error: data.status, message: data.error_message || 'Geocoding failed' }) };
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { statusCode: 200, body: JSON.stringify({ lat, lng }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
