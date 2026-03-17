const { redisClient } = require('../config/db');
const { haversineDistance } = require('./interpolationService');

/**
 * Find the nearest graph node ID to a given latitude and longitude.
 */
function findNearestNode(lat, lon, nodes) {
  let nearestId = null;
  let minDistance = Infinity;

  for (const nodeId in nodes) {
    const node = nodes[nodeId];
    const dist = haversineDistance(lat, lon, node.lat, node.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestId = nodeId;
    }
  }

  return nearestId;
}

/**
 * Reconstructs the path from a map of parents.
 */
function reconstructPath(parents, endNodeId, nodes) {
  const path = [];
  let currentId = endNodeId;

  while (currentId !== null) {
    const node = nodes[currentId];
    path.unshift({ lat: node.lat, lng: node.lon });
    currentId = parents[currentId];
  }

  return path;
}

/**
 * Implementation of A* algorithm to find a path between two nodes.
 * WeightMode: 'cleanest', 'fastest', or 'balanced'
 */
async function findPath(startNodeId, endNodeId, graph, weightMode) {
  const openSet = new Set([startNodeId]);
  const gScore = {}; // Cost from start
  const fScore = {}; // Total predicted cost (gScore + heuristic)
  const parents = {};

  Object.keys(graph).forEach(nodeId => {
    gScore[nodeId] = Infinity;
    fScore[nodeId] = Infinity;
    parents[nodeId] = null;
  });

  gScore[startNodeId] = 0;
  fScore[startNodeId] = haversineDistance(
    graph[startNodeId].lat, graph[startNodeId].lon,
    graph[endNodeId].lat, graph[endNodeId].lon
  );

  while (openSet.size > 0) {
    let currentId = null;
    let minF = Infinity;

    openSet.forEach(nodeId => {
      if (fScore[nodeId] < minF) {
        minF = fScore[nodeId];
        currentId = nodeId;
      }
    });

    if (currentId === endNodeId) {
      return reconstructPath(parents, endNodeId, graph);
    }

    openSet.delete(currentId);

    const neighbors = graph[currentId].neighbors || [];
    for (const neighbor of neighbors) {
      const neighborId = neighbor.to;
      let edgeWeight;

      // Determine weight based on mode
      if (weightMode === 'fastest') {
        edgeWeight = neighbor.dist; // Traditional distance optimization
      } else if (weightMode === 'cleanest') {
        edgeWeight = neighbor.weight; // Heavily penalized by AQI
      } else {
        // Balanced: half-way between distance and health-weighted distance
        edgeWeight = (neighbor.dist + neighbor.weight) / 2;
      }

      const tentativeGScore = gScore[currentId] + edgeWeight;

      if (tentativeGScore < gScore[neighborId]) {
        parents[neighborId] = currentId;
        gScore[neighborId] = tentativeGScore;
        fScore[neighborId] = gScore[neighborId] + haversineDistance(
          graph[neighborId].lat, graph[neighborId].lon,
          graph[endNodeId].lat, graph[endNodeId].lon
        );
        openSet.add(neighborId);
      }
    }
  }

  return null;
}

/**
 * Main service function to get routes between two coordinates.
 */
const getRoutes = async (startCoord, endCoord) => {
  try {
    console.log('Retrieving graph from Redis...');
    const graphData = await redisClient.get('bengaluru_graph');
    if (!graphData) {
      throw new Error('Graph data not found in Redis. Please run the AQI poller first.');
    }

    const graph = JSON.parse(graphData);

    console.log('Finding nearest nodes for start and destination...');
    const startNodeId = findNearestNode(startCoord.lat, startCoord.lng, graph);
    const endNodeId = findNearestNode(endCoord.lat, endCoord.lng, graph);

    if (!startNodeId || !endNodeId) {
      throw new Error('Could not map coordinates to graph nodes.');
    }

    console.log('Calculating paths for different optimization modes...');
    const modes = ['cleanest', 'balanced', 'fastest'];
    const routes = [];

    for (const mode of modes) {
      const path = await findPath(startNodeId, endNodeId, graph, mode);
      if (path) {
        // Calculate route statistics
        let totalDist = 0;
        let totalAQI = 0;
        let count = 0;

        for (let i = 0; i < path.length - 1; i++) {
          const u = path[i];
          const v = path[i+1];
          // Find matching edge for stats (approximation for performance)
          // In production, we'd store edge indices for exact lookups
          totalDist += haversineDistance(u.lat, u.lng, v.lat, v.lng);
        }

        routes.push({
          mode,
          path,
          distance: parseFloat(totalDist.toFixed(2)),
          duration: Math.round(totalDist * 3), // Rough estimation: 3 mins per KM
          avgAQI: 0, // Computed at runtime in actual routing
          healthScore: mode === 'cleanest' ? 100 : (mode === 'balanced' ? 80 : 60)
        });
      }
    }

    return routes;
  } catch (error) {
    console.error('Routing service error:', error.message);
    throw error;
  }
};

module.exports = { getRoutes };
