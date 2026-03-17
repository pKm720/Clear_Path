const axios = require('axios');
const { redisClient } = require('../config/db');
const SensorReading = require('../models/SensorReading');
const { calculateAQIForPoint, haversineDistance } = require('./interpolationService');

const BENGALURU_BBOX = '12.8,77.4,13.2,77.8';

/**
 * Builds the road network graph for Bengaluru using OSM data.
 * Computes weights based on distance and interpolated AQI exposure.
 */
const buildGraph = async () => {
  try {
    // Pre-fetch sensors for interpolation to avoid N+1 query problem
    const sensors = await SensorReading.find({ aqi: { $gt: 0 } });
    
    console.log('Fetching OSM data from Overpass API...');
    const query = `
      [out:json];
      way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](${BENGALURU_BBOX});
      (._;>;);
      out body;
    `;
    const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`);

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

    // Build adjacency list
    for (const way of ways) {
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const uId = way.nodes[i];
        const vId = way.nodes[i + 1];

        const u = nodes[uId];
        const v = nodes[vId];

        if (u && v) {
          const dist = haversineDistance(u.lat, u.lon, v.lat, v.lon);

          // Interpolate AQI at the midpoint of the edge
          const midLat = (u.lat + v.lat) / 2;
          const midLon = (u.lon + v.lon) / 2;
          const aqi = await calculateAQIForPoint(midLat, midLon, sensors);

          // Weight = distance * (1 + (aqi / 100))
          // This scales weight: higher AQI = higher penalty
          const weight = dist * (1 + (aqi / 100));

          if (!graph[uId]) graph[uId] = { lat: u.lat, lon: u.lon, neighbors: [] };
          if (!graph[vId]) graph[vId] = { lat: v.lat, lon: v.lon, neighbors: [] };

          graph[uId].neighbors.push({ to: vId, dist, weight, aqi });
          graph[vId].neighbors.push({ to: uId, dist, weight, aqi }); // Assuming undirected for now
        }
      }
    }

    console.log('Storing graph in Redis...');
    // Store the graph as a single JSON for now. 
    // In V2, might shard this or use a graph DB.
    await redisClient.set('bengaluru_graph', JSON.stringify(graph));

    console.log('Graph successfully built and stored in Redis!');
    return true;
  } catch (error) {
    console.error('Error building graph:', error.message);
    if (error.response) console.error('Overpass Response:', error.response.data);
    return false;
  }
};

module.exports = { buildGraph };
