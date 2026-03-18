const { getRoutes, snapToPath } = require('../services/routingService');

const VALID_TRANSPORT_MODES = ['car', 'motorbike', 'pedestrian'];

function isValidCoord(coord) {
  return coord && 
         typeof coord.lat === 'number' && 
         (typeof coord.lng === 'number' || typeof coord.lon === 'number');
}

const calculateRoute = async (req, res) => {
  const { start, end, transport = 'car' } = req.body;

  if (!isValidCoord(start) || !isValidCoord(end)) {
    return res.status(400).json({ 
      error: 'Invalid coordinates. Required format: { lat: number, lon: number } or { lat: number, lng: number }' 
    });
  }

  if (!VALID_TRANSPORT_MODES.includes(transport)) {
    return res.status(400).json({
      error: `Invalid transport mode. Must be one of: ${VALID_TRANSPORT_MODES.join(', ')}`
    });
  }

  try {
    const routes = await getRoutes(start, end, transport);
    res.json({ routes });
  } catch (error) {
    console.error('Route controller error:', error.message);
    res.status(500).json({ error: 'Failed to calculate routes.' });
  }
};

const snapToRoute = async (req, res) => {
  const { current, path } = req.body;

  if (!isValidCoord(current)) {
    return res.status(400).json({ error: 'Invalid current coordinates.' });
  }

  if (!path || !Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: 'Valid path (array of coords) is required.' });
  }

  try {
    const result = snapToPath(current, path);
    if (!result) {
      return res.status(500).json({ error: 'Failed to snap point to path.' });
    }
    res.json(result);
  } catch (error) {
    console.error('Snap controller error:', error.message);
    res.status(500).json({ error: 'Failed to process snap request.' });
  }
};

module.exports = { calculateRoute, snapToRoute };
