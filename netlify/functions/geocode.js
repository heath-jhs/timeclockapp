exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { address } = JSON.parse(event.body);

  if (!address) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing address' }) };
  }

  try {
    console.log('Geocoding address:', address); // Debug input
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=US&q=${encodeURIComponent(address)}`, {
      headers: { 'User-Agent': 'TimeClockApp/1.0 (heath@jhstrickland.com)' }
    });
    const data = await response.json();
    console.log('Geocode response:', data); // Debug full response
    if (data.length === 0) {
      throw new Error('Address not found - try adding ZIP or full state');
    }
    // Pick the first/best match
    const { lat, lon } = data[0];
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      throw new Error('Invalid lat/lon parsed');
    }
    console.log('Parsed lat/lon:', parsedLat, parsedLon); // Debug output
    return { statusCode: 200, body: JSON.stringify({ lat: parsedLat, lon: parsedLon }) };
  } catch (error) {
    console.error('Geocode error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
