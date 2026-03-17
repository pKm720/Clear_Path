const { getRoutes } = require('../services/routingService');

/**
 * Validates coordinate object structure.
 */
function isValidCoord(coord) {
  return coord && 
         typeof coord.lat === 'number' && 
         (typeof coord.lng === 'number' || typeof coord.lon === 'number');
}

/**
 * Handles POST requests to calculate paths between start and end coordinates.
 */
const calculateRoute = async (req, res) => {
  const { start, end } = req.body;

  if (!isValidCoord(start) || !isValidCoord(end)) {
    return res.status(400).json({ 
      error: 'Invalid coordinates. Required format: { lat: number, lon: number } or { lat: number, lng: number }' 
    });
  }

  try {
    const routes = await getRoutes(start, end);
    res.json({ routes });
  } catch (error) {
    console.error('Route controller error:', error.message);
    res.status(500).json({ error: 'Failed to calculate routes.' });
  }
};

module.exports = { calculateRoute };
