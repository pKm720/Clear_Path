const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { redisClient } = require('../config/db');
const { getUnifiedSensors } = require('./sensorService');
const { calculateAQIForPoint, haversineDistance } = require('./interpolationService');
const { clearCache } = require('./routingService');

const CENTER_BBOX = '12.91,77.56,13.04,77.70'; // High Density (Full Street Detail)
const CITY_WIDE_BBOX = '12.83,77.37,13.14,77.83'; // Outer Suburbs (Major Arterials Only)
const CACHE_PATH = path.join(__dirname, '../data/osm_bengaluru_cache.json');

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.n.osm.ch/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
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
    
    // MEMORY OPTIMIZATION: Clear the old 100MB routing cache before allocating HTTP response chunks
    clearCache();
    
    const query = `
      [out:json][timeout:60];
      (
        // 1. All roads for the central 15x15km core
        way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street"](${CENTER_BBOX});
        
        // 2. Major arterials for the entire 35x45km Bengaluru city region
        way["highway"~"motorway|trunk|primary|secondary"](${CITY_WIDE_BBOX});
      );
      (._;>;);
      out body;
    `;

    let response;
    let lastError;
    let fetchedFromAPI = false;

    const queryData = `data=${encodeURIComponent(query)}`;

    for (const mirror of OVERPASS_MIRRORS) {
      try {
        console.log(`Trying Overpass mirror: ${mirror} ...`);
        response = await axios.post(mirror, queryData, {
          timeout: 90000, // Increased to 90s for dense regions like Bengaluru
          headers: { 
            'User-Agent': 'ClearPath-Router/1.5 (https://github.com/pKm720/Clear_Path; contact: priyanshu@example.com)',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (!response.data?.elements?.length) throw new Error('Empty OSM data from mirror');
        
        console.log(`Successfully fetched OSM data from: ${mirror}`);
        
        // Save to local cache for future fallback
        try {
          fs.writeFileSync(CACHE_PATH, JSON.stringify(response.data));
          console.log(`Saved fresh OSM data to local cache: ${CACHE_PATH}`);
        } catch (fsErr) {
          console.warn('Failed to write OSM cache to disk:', fsErr.message);
        }
        
        fetchedFromAPI = true;
        break; 
      } catch (err) {
        lastError = err;
        const status = err.response ? `Status ${err.response.status}` : 'Network Error';
        console.warn(`Overpass Mirror Failed (${mirror}): ${status} - ${err.message}.`);
      }
    }

    // FALLBACK: If all mirrors fail, try to load from the local cache file
    if (!fetchedFromAPI) {
      console.log('All Overpass mirrors failed. Attempting to load from local file cache...');
      if (fs.existsSync(CACHE_PATH)) {
        try {
          const cacheData = fs.readFileSync(CACHE_PATH, 'utf8');
          response = { data: JSON.parse(cacheData) };
          console.log(`Successfully loaded cached OSM data from: ${CACHE_PATH}`);
        } catch (cacheErr) {
          console.error('Local cache file is corrupted or unreadable:', cacheErr.message);
        }
      } else {
        console.warn('No local cache file found.');
      }
    }

    if (!response?.data?.elements?.length) {
      console.warn(`All Overpass mirrors failed. Last error: ${lastError?.message}. Routing will be unavailable until OSM data is successfully downloaded.`);
      return false;
    }

    let elements = response.data.elements;
    let nodes = {};
    let ways = [];

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

    // MEMORY OPTIMIZATION: Flush massive arrays to trigger garbage collection BEFORE JSON stringify spike
    elements = null;
    response = null;
    nodes = null;
    ways = null;

    console.log('Graph built in memory. Stringifying for Redis...');
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
