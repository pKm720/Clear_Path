const axios = require('axios');
const { redisClient } = require('../config/db');
const SensorReading = require('../models/SensorReading');
const { calculateAQIForPoint, haversineDistance } = require('./interpolationService');
const { clearCache } = require('./routingService');

const BENGALURU_BBOX = '12.8,77.4,13.2,77.8';

/**
 * Builds the road network graph for Bengaluru using OSM data.
 * Computes weights based on distance and interpolated AQI exposure.
 */
const buildGraph = async () => {
  try {
    // Pre-fetch sensors for interpolation to avoid N+1 query problem
    const sensors = await SensorReading.find({ aqi: { $gt: 0 } });

    console.log('Fetching OSM data from Overpass API (this may take a minute)...');
    const query = `
      [out:json][timeout:90];
      way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|footway|path|pedestrian|living_street"](${BENGALURU_BBOX});
      (._;>;);
      out body;
    `;

    let response;
    let retries = 3;

    while (retries > 0) {
      try {
        response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
          timeout: 120000 // 2 minute timeout for large responses
        });
        break; // Success
      } catch (err) {
        retries--;
        console.warn(`Overpass attempt failed. Retries left: ${retries}`);
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }

    const elements = response.data.elements;
    const nodes = {};
    const ways = [];

    // Separate nodes and ways
    elements.forEach(el => {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lon: el.lon };
      } else if (el.type === 'way') {
        ways.push(el);
      }
    });

    console.log(`Processed ${Object.keys(nodes).length} nodes and ${ways.length} ways.`);

    const graph = {};

    // Build adjacency list respecting one-way restrictions
    for (const way of ways) {
      const tags = way.tags || {};
      const oneway = tags.oneway;

      // oneway=yes or oneway=true: only u->v allowed
      // oneway=-1 or oneway=reverse: only v->u allowed
      const isOneWayForward = oneway === 'yes' || oneway === 'true' || oneway === '1';
      const isOneWayReverse = oneway === '-1' || oneway === 'reverse';

      for (let i = 0; i < way.nodes.length - 1; i++) {
        const uId = way.nodes[i];
        const vId = way.nodes[i + 1];

        const u = nodes[uId];
        const v = nodes[vId];

        if (u && v) {
          const dist = haversineDistance(u.lat, u.lon, v.lat, v.lon);

          const midLat = (u.lat + v.lat) / 2;
          const midLon = (u.lon + v.lon) / 2;
          const aqi = await calculateAQIForPoint(midLat, midLon, sensors);

          const weight = dist * (1 + (aqi / 100));

          const highwayType = tags.highway || 'unclassified';

          // Pedestrians ignore oneway restrictions
          const isFootWay = highwayType === 'footway' || highwayType === 'path' || highwayType === 'pedestrian';

          if (!graph[uId]) graph[uId] = { lat: u.lat, lon: u.lon, neighbors: [] };
          if (!graph[vId]) graph[vId] = { lat: v.lat, lon: v.lon, neighbors: [] };

          if (!isOneWayReverse || isFootWay) {
            graph[uId].neighbors.push({ to: vId, dist, weight, aqi, highway: highwayType });
          }

          if (!isOneWayForward || isFootWay) {
            graph[vId].neighbors.push({ to: uId, dist, weight, aqi, highway: highwayType });
          }
        }
      }
    }

    console.log('Storing graph in Redis...');
    // Store the graph as a single JSON for now. 
    // In V2, might shard this or use a graph DB.
    await redisClient.set('bengaluru_graph', JSON.stringify(graph));
    clearCache(); // Invalidate in-memory routing cache

    console.log('Graph successfully built and stored in Redis!');
    return true;
  } catch (error) {
    console.error('Error building graph:', error.message);
    if (error.response) console.error('Overpass Response:', error.response.data);
    return false;
  }
};

module.exports = { buildGraph };
