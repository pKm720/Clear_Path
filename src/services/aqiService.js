const axios = require('axios');

// Using the free WAQI 'search' or 'map' endpoint. 
// For production, use a real token.
const WAQI_TOKEN = process.env.WAQI_TOKEN || 'demo';

/**
 * Fetches air quality data for the bounding box of Bengaluru.
 * Bounding box roughly: [77.4, 12.8, 77.8, 13.2]
 */
const fetchBengaluruAQI = async () => {
  try {
    // WAQI Map Bounds API
    // Format: latlng=lat1,lng1,lat2,lng2
    const BBOX = '12.8,77.4,13.2,77.8';
    const response = await axios.get(`https://api.waqi.info/map/bounds/?latlng=${BBOX}&token=${WAQI_TOKEN}`);

    if (response.data.status !== 'ok') {
      throw new Error(`WAQI API Error: ${response.data.data}`);
    }

    const stations = response.data.data;

    // Normalize data shape
    const readings = stations.map(station => ({
      uid: station.uid,
      lat: station.lat,
      lng: station.lon, // WAQI uses 'lon'
      aqi: isNaN(parseInt(station.aqi)) ? 0 : parseInt(station.aqi), // Sometimes AQI is '-'
      stationName: station.station.name,
      timestamp: new Date()
    }));

    return readings;
  } catch (error) {
    console.error('Error fetching AQI from WAQI:', error.message);
    return [];
  }
};

module.exports = { fetchBengaluruAQI };
