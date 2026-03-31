const axios = require('axios');
const WAQI_TOKEN = process.env.WAQI_TOKEN || 'demo';

const fetchFromWAQI = async () => {
  try {
    const BBOX = '12.8,77.3,13.2,77.9';
    const response = await axios.get(`https://api.waqi.info/map/bounds/?latlng=${BBOX}&token=${WAQI_TOKEN}`);
    if (response.data.status !== 'ok') return [];

    return response.data.data.map(station => ({
      uid: `waqi_${station.uid}`,
      lat: station.lat,
      lng: station.lon,
      aqi: isNaN(parseInt(station.aqi)) || parseInt(station.aqi) <= 0
        ? null
        : parseInt(station.aqi),
      stationName: station.station.name,
      timestamp: new Date()
    })).filter(r => r.aqi !== null);
  } catch (err) {
    console.error('WAQI fetch failed:', err.message);
    return [];
  }
};

const fetchOpenAQData = async () => {
  try {
    // OpenAQ v3 API: Search by Bounding Box for Bengaluru coverage
    // BBOX: [minLon, minLat, maxLon, maxLat]
    const BBOX = '77.3,12.8,77.9,13.2';
    const OPENAQ_KEY = process.env.OPENAQ_API_KEY;
    const headers = { 'Accept': 'application/json' };
    if (OPENAQ_KEY) headers['X-API-Key'] = OPENAQ_KEY;

    const response = await axios.get(
      `https://api.openaq.org/v3/locations?bbox=${BBOX}`,
      { timeout: 10000, headers }
    );

    if (!response.data?.results) return [];

    const readings = [];
    response.data.results.forEach(loc => {
      // Find PM2.5 sensor in the location results
      const pm25Sensor = loc.sensors?.find(s => s.parameter?.name === 'pm25');
      if (!pm25Sensor || !pm25Sensor.latest?.value || pm25Sensor.latest.value <= 0) return;

      // Convert PM2.5 to approximate AQI (Simplified US EPA Formula)
      const aqi = Math.min(Math.round(pm25Sensor.latest.value * 3.5), 500); 
      
      readings.push({
        uid: `openaq_${loc.id}`,
        lat: loc.coordinates.latitude,
        lng: loc.coordinates.longitude,
        aqi,
        pm25: pm25Sensor.latest.value,
        stationName: loc.name,
        timestamp: new Date()
      });
    });

    return readings;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('OpenAQ v3: API Key missing or invalid. Set OPENAQ_API_KEY in .env to enable this source.');
    } else {
      console.warn('OpenAQ v3 fetch failed:', err.message);
    }
    return [];
  }
};

/**
 * Fetches air quality data from both WAQI and OpenAQ and merges them.
 */
const fetchBengaluruAQI = async () => {
  console.log('Fetching live AQI data from multiple sources...');
  const [waqiReadings, openaqReadings] = await Promise.all([
    fetchFromWAQI(),
    fetchOpenAQData()
  ]);

  const combined = [...waqiReadings, ...openaqReadings];
  console.log(`AQI Unified: ${combined.length} stations found (${waqiReadings.length} WAQI, ${openaqReadings.length} OpenAQ)`);
  
  return combined;
};

module.exports = { fetchBengaluruAQI };
