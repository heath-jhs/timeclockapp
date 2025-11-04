exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { address } = JSON.parse(event.body);

  if (!address) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing address' }) };
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
      headers: { 'User-Agent': 'TimeClockApp/1.0 (your.email@example.com)' }  // Replace with your email for API compliance
    });
    const data = await response.json();
    if (data.length === 0) {
      throw new Error('Address not found');
    }
    const { lat, lon } = data[0];
    return { statusCode: 200, body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
