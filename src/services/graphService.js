const axios = require('axios');
const { redisClient } = require('../config/db');
const { getUnifiedSensors } = require('./sensorService');
const { calculateAQIForPoint, haversineDistance } = require('./interpolationService');
const { clearCache } = require('./routingService');

const CENTER_BBOX = '12.91,77.56,13.04,77.70'; // High Density (Full Street Detail)
const CITY_WIDE_BBOX = '12.83,77.37,13.14,77.83'; // Outer Suburbs (Major Arterials Only)
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];



const ROAD_POLLUTION_MULTIPLIER = {
  motorway:      2.2,
  trunk:         1.9,
  primary:       1.6,
  secondary:     1.3,
  tertiary:      1.0,
  unclassified:  0.9,
  residential:   0.7,
  living_street: 0.5,
  footway:       0.4,
  path:          0.3,
  pedestrian:    0.3,
};

/**
 * Builds the road network graph for Bengaluru using OSM data.
 */
const buildGraph = async () => {
  try {
    // Discovery of all sensors including physical and AI-predicted virtual stations
    const sensors = await getUnifiedSensors();
    const aqiValues = sensors.length > 0 ? sensors.map(s => s.aqi) : [50];
    const minAQI = Math.min(...aqiValues);
    const maxAQI = Math.max(...aqiValues);
    const aqiRange = (maxAQI - minAQI) || 1;

    console.log('Attempting to fetch live OSM data (Fast 30s Timeout)...');
    
    const query = `
      [out:json][timeout:60];
      (
        // 1. All roads for the central 15x15km core
        way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street"](${CENTER_BBOX});
        
        // 2. Major arterials for the entire 35x45km Bengaluru city region
        way["highway"~"motorway|trunk|primary|secondary|tertiary"](${CITY_WIDE_BBOX});
      );
      (._;>;);
      out body;
    `;

    let response;
    let lastError;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        console.log(`Trying Overpass mirror: ${mirror} ...`);
        response = await axios.post(mirror, `data=${encodeURIComponent(query)}`, {
          timeout: 45000,
          headers: { 'User-Agent': 'ClearPath-Arterial-Bot/1.2' }
        });
        if (!response.data?.elements?.length) throw new Error('Empty OSM data from mirror');
        console.log(`Successfully fetched OSM data from: ${mirror}`);
        break; // Success — stop trying other mirrors
      } catch (err) {
        lastError = err;
        console.warn(`Overpass Mirror Failed (${mirror}): ${err.message}. Trying next mirror...`);
      }
    }

    if (!response?.data?.elements?.length) {
      console.warn(`All Overpass mirrors failed. Last error: ${lastError?.message}. Routing will be unavailable until OSM data is successfully downloaded.`);
      return false;
    }

    const elements = response.data.elements;
    const nodes = {};
    const ways = [];

    elements.forEach(el => {
      if (el.type === 'node') nodes[el.id] = { lat: el.lat, lon: el.lon };
      else if (el.type === 'way') ways.push(el);
    });

    const graph = {};

    for (const way of ways) {
      const highwayType = way.tags?.highway || 'unclassified';
      const roadMultiplier = ROAD_POLLUTION_MULTIPLIER[highwayType] || 1.0;

      for (let i = 0; i < way.nodes.length - 1; i++) {
        const uId = way.nodes[i], vId = way.nodes[i+1];
        const u = nodes[uId], v = nodes[vId];

        if (u && v) {
          const dist = haversineDistance(u.lat, u.lon, v.lat, v.lon);
          const aqi = await calculateAQIForPoint((u.lat+v.lat)/2, (u.lon+v.lon)/2, sensors);
          
          // AGGRESSIVE DIFFERENTIATION: 5x weight for high-aqi edges in 'cleanest' mode
          const normalizedAQI = (aqi - minAQI) / aqiRange; 
          const weight = dist * (1 + (normalizedAQI * 5.0)) * roadMultiplier;

          if (!graph[uId]) graph[uId] = { lat: u.lat, lon: u.lon, neighbors: [] };
          if (!graph[vId]) graph[vId] = { lat: v.lat, lon: v.lon, neighbors: [] };
          
          graph[uId].neighbors.push({ to: vId, dist, weight, aqi, highway: highwayType });
          graph[vId].neighbors.push({ to: uId, dist, weight, aqi, highway: highwayType });
        }
      }
    }

    await redisClient.set('bengaluru_graph', JSON.stringify(graph));
    clearCache();
    console.log('Graph built successfully with real OSM data!');
    return true;
  } catch (error) {
    console.error('Unexpected build error:', error.message);
    return false;
  }
};

module.exports = { buildGraph };
