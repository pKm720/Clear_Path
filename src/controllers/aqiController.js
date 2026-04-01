const { calculateAQIForPoint } = require('../services/interpolationService');
const { getUnifiedSensors } = require('../services/sensorService');

/**
 * Retrieves estimated AQI for a specific geographic point.
 */
const getAQIAtPoint = async (req, res) => {
  const { lat, lng } = req.params;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude.' });
  }

  try {
    const aqi = await calculateAQIForPoint(latitude, longitude);
    res.json({ lat: latitude, lng: longitude, aqi });
  } catch (error) {
    console.error('AQI controller error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve AQI data.' });
  }
};

/**
 * Retrieves all physical sensor readings currently stored and 
 * merges them with live predicted virtual sensors from the ML engine.
 */
const getAllSensors = async (req, res) => {
  try {
    // Utilizing the Sensor Intelligence Hub for a unified Bengaluru data layer
    const sensors = await getUnifiedSensors();
    res.json(sensors);
  } catch (error) {
    console.error('Sensor retrieval error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve sensor data.' });
  }
};

module.exports = { getAQIAtPoint, getAllSensors };
