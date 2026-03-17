const { redisClient } = require('../config/db');
const { haversineDistance } = require('./interpolationService');
const FastPriorityQueue = require('fastpriorityqueue');

// Roads accessible per transport mode
const ACCESSIBLE_ROADS = {
  car:        new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']),
  motorbike:  new Set(['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']),
  // India OSM has very sparse footway mapping. Pedestrians use road shoulders of all road types.
  pedestrian: null // null = no filter, all road types accessible at walking speed
};

// Speed in km/h per transport mode
const SPEED_KMH = {
  car: 30,
  motorbike: 35,
  pedestrian: 5
};

// Max nodes A* can explore per mode (pedestrian paths are denser, need higher cap)
const NODE_LIMIT = {
  car: 100000,
  motorbike: 100000,
  pedestrian: 300000
};

// Global in-memory cache for the massive graph and spatial index
let cachedGraph = null;
let spatialIndex = null;
const GRID_SIZE = 100; // 100x100 grid for spatial indexing

/**
 * Builds a simple spatial grid for O(1) nearest-node lookup.
 */
function buildSpatialIndex(nodes) {
  const index = {};
  for (const nodeId in nodes) {
    const node = nodes[nodeId];
    // Flatten the globe into a manageable grid for Bengaluru
    const gridX = Math.floor((node.lat - 12.8) * 250); // Scale to ~100 range
    const gridY = Math.floor((node.lon - 77.4) * 250);
    const key = `${gridX},${gridY}`;
    
    if (!index[key]) index[key] = [];
    index[key].push(nodeId);
  }
  return index;
}

/**
 * Find the nearest graph node ID using the spatial grid for performance.
 */
function findNearestNode(lat, lon, nodes, transportMode) {
  const gridX = Math.floor((lat - 12.8) * 250);
  const gridY = Math.floor((lon - 77.4) * 250);
  
  const allowedRoads = ACCESSIBLE_ROADS[transportMode];
  let nearestId = null;
  let minDistance = Infinity;

  // Search surrounding grid cells, expanding radius if needed
  for (let radius = 1; radius <= 5; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // Only outer ring
        const cellNodes = spatialIndex[`${gridX + dx},${gridY + dy}`] || [];
        for (const nodeId of cellNodes) {
          const node = nodes[nodeId];
          // For transport-aware search, require at least one accessible neighbor
          if (allowedRoads) {
            const hasAccess = (node.neighbors || []).some(n => !n.highway || allowedRoads.has(n.highway));
            if (!hasAccess) continue;
          }
          const dist = haversineDistance(lat, lon, node.lat, node.lon);
          if (dist < minDistance) {
            minDistance = dist;
            nearestId = nodeId;
          }
        }
      }
    }
    if (nearestId) break; // Found a valid node, stop expanding
  }

  // Hard fallback: ignore access filter, just find nearest
  if (!nearestId) {
    for (const nodeId in nodes) {
      const node = nodes[nodeId];
      const dist = haversineDistance(lat, lon, node.lat, node.lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestId = nodeId;
      }
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
    path.unshift({ id: currentId, lat: node.lat, lon: node.lon });
    currentId = parents[currentId];
  }

  return path;
}

/**
 * Implementation of A* algorithm to find a path between two nodes.
 * WeightMode: 'cleanest', 'fastest', or 'balanced'
 */
async function findPath(startNodeId, endNodeId, graph, weightMode, transportMode) {
  // 1. Pre-calculate target coordinates for the heuristic
  const targetNode = graph[endNodeId];
  if (!targetNode) return null;
  const targetLat = targetNode.lat;
  const targetLon = targetNode.lon;

  const gScore = {}; 
  const fScore = {}; 
  const parents = {};
  const closedSet = new Set(); // To avoid processing the same node multiple times

  // 2. Optimized Priority Queue Comparison
  const openSet = new FastPriorityQueue((a, b) => {
    const fA = fScore[a] !== undefined ? fScore[a] : Infinity;
    const fB = fScore[b] !== undefined ? fScore[b] : Infinity;
    return fA < fB;
  });

  gScore[startNodeId] = 0;
  fScore[startNodeId] = haversineDistance(
    graph[startNodeId].lat, graph[startNodeId].lon,
    targetLat, targetLon
  );
  parents[startNodeId] = null;
  openSet.add(startNodeId);

  let nodesVisited = 0;

  while (!openSet.isEmpty()) {
    const currentId = openSet.poll();
    nodesVisited++;

    // Safety brake for extremely large searches
    const limit = NODE_LIMIT[transportMode] || 100000;
    if (nodesVisited > limit) {
      console.warn(`Pathfinding limit (${limit}) reached for ${transportMode} mode.`);
      return null;
    }

    if (currentId === endNodeId) {
      return reconstructPath(parents, endNodeId, graph);
    }

    // Skip if we've already processed this node via a better path
    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    const neighbors = graph[currentId].neighbors || [];
    for (const neighbor of neighbors) {
      const neighborId = String(neighbor.to);
      if (closedSet.has(neighborId)) continue;

      // Filter out roads not accessible by the current transport mode
      const allowedRoads = ACCESSIBLE_ROADS[transportMode];
      if (allowedRoads && neighbor.highway && !allowedRoads.has(neighbor.highway)) continue;

      let edgeWeight;
      if (weightMode === 'fastest') {
        edgeWeight = neighbor.dist;
      } else if (weightMode === 'cleanest') {
        edgeWeight = neighbor.weight; 
      } else {
        edgeWeight = (neighbor.dist + neighbor.weight) / 2;
      }

      const tentativeGScore = gScore[currentId] + edgeWeight;

      if (tentativeGScore < (gScore[neighborId] || Infinity)) {
        parents[neighborId] = currentId;
        gScore[neighborId] = tentativeGScore;
        fScore[neighborId] = gScore[neighborId] + haversineDistance(
          graph[neighborId].lat, graph[neighborId].lon,
          targetLat, targetLon
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
const getRoutes = async (startCoord, endCoord, transportMode = 'car') => {
  try {
    // 1. Check/Load in-memory cache to avoid heavy JSON parsing
    if (!cachedGraph) {
      console.log('Cache miss: Loading massive graph into memory...');
      const graphData = await redisClient.get('bengaluru_graph');
      if (!graphData) {
        throw new Error('Graph data not found in Redis. Please run the AQI poller first.');
      }
      cachedGraph = JSON.parse(graphData);
      console.log('Building spatial grid index...');
      spatialIndex = buildSpatialIndex(cachedGraph);
      console.log('Graph optimization complete.');
    }

    const graph = cachedGraph;

    console.log('Finding nearest nodes using spatial index...');
    const startLon = startCoord.lon || startCoord.lng;
    const endLon = endCoord.lon || endCoord.lng;
    
    // For pedestrian mode, snap to main road network nodes (well-connected).
    // Footway nodes in Indian OSM data are isolated stubs with no connection to the main graph.
    const snapMode = transportMode === 'pedestrian' ? 'car' : transportMode;
    const startNodeId = findNearestNode(startCoord.lat, startLon, graph, snapMode);
    const endNodeId = findNearestNode(endCoord.lat, endLon, graph, snapMode);

    if (!startNodeId || !endNodeId) {
      throw new Error('Could not map coordinates to graph nodes.');
    }

    // Log the nodes found and their accessible neighbors
    const startAccessible = (graph[startNodeId].neighbors || []).filter(n => !n.highway || ACCESSIBLE_ROADS[transportMode]?.has(n.highway)).length;
    const endAccessible   = (graph[endNodeId].neighbors   || []).filter(n => !n.highway || ACCESSIBLE_ROADS[transportMode]?.has(n.highway)).length;
    console.log(`Start node: ${startNodeId}, accessible neighbors: ${startAccessible}`);
    console.log(`End node:   ${endNodeId}, accessible neighbors: ${endAccessible}`);

    console.log('Calculating paths for cleaner/balanced/fastest modes...');
    const modes = ['cleanest', 'balanced', 'fastest'];
    const routes = [];

    for (const mode of modes) {
      const path = await findPath(startNodeId, endNodeId, graph, mode, transportMode);
      console.log(`  [${transportMode}/${mode}] path found: ${path ? path.length + ' nodes' : 'null'}`);
      if (path) {
        let totalDist = 0;
        let totalAQI = 0;
        let edgeCount = 0;

        for (let i = 0; i < path.length - 1; i++) {
          const uId = path[i].id;
          const vId = path[i+1].id;
          
          const node = graph[uId];
          const edge = node.neighbors.find(n => String(n.to) === vId);

          if (edge) {
            totalDist += edge.dist;
            totalAQI += edge.aqi;
            edgeCount++;
          }
        }

        routes.push({
          mode,
          path: path.map(p => ({ lat: p.lat, lon: p.lon })), 
          distance: parseFloat(totalDist.toFixed(2)),
          duration: Math.round((totalDist / SPEED_KMH[transportMode]) * 60), // Minutes at mode-specific speed
          avgAQI: edgeCount > 0 ? Math.round(totalAQI / edgeCount) : 0,
          transport: transportMode,
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

/**
 * Clears the in-memory graph cache (used after rebuilding the graph).
 */
const clearCache = () => {
  cachedGraph = null;
  spatialIndex = null;
  console.log('Routing graph cache invalidated.');
};

module.exports = { getRoutes, clearCache };
