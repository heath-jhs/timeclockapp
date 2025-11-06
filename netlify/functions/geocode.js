exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { address } = JSON.parse(event.body);
  if (!address) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing address' }) };
  }
  const maxRetries = 3;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      console.log('Geocoding address:', address); // Debug input
      // Try Nominatim first
      let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=US&q=${encodeURIComponent(address)}`, {
        headers: { 'User-Agent': 'TimeClockApp/1.0 (heath@jhstrickland.com)' }
      });
      let data = await response.json();
      console.log('Nominatim response:', data); // Debug
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
          console.log('Nominatim success lat/lon:', parsedLat, parsedLon);
          return { statusCode: 200, body: JSON.stringify({ lat: parsedLat, lon: parsedLon }) };
        }
      }
      // Fallback to Google if Nominatim fails
      console.log('Nominatim failed - falling back to Google');
      response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_KEY}`);
      data = await response.json();
      console.log('Google response:', data); // Debug
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'OVER_DAILY_LIMIT') {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        continue;
      }
      if (data.status !== 'OK' || data.results.length === 0) {
        throw new Error('Address not found - try adding ZIP or full state');
      }
      const { lat, lng } = data.results[0].geometry.location;
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lng);
      console.log('Google success lat/lon:', parsedLat, parsedLon);
      return { statusCode: 200, body: JSON.stringify({ lat: parsedLat, lon: parsedLon }) };
    } catch (error) {
      console.error('Geocode error:', error);
      if (error.message.includes('rate limit')) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
  }
  return { statusCode: 429, body: JSON.stringify({ message: 'Rate limit exceeded after retries' }) };
};
