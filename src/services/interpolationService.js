const SensorReading = require('../models/SensorReading');

//Calculate Haversine distance between two points in km.
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  //a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
  //how far are two points given... 
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  //convert that into an angle c using atan2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the estimated AQI at a specific lat/lng using
 * Inverse Distance Weighting (IDW) interpolation.
 * 
 * @param {Number} targetLat 
 * @param {Number} targetLng 
 * @param {Number} power The 'p' parameter in IDW (default 2)
 * @returns {Number} Estimated AQI
 */
const calculateAQIForPoint = async (targetLat, targetLng, power = 2) => {
  try {
    // 1. Fetch all latest sensor readings from DB
    // Only want aqi > 0 to avoid breaking math with missing data
    const sensors = await SensorReading.find({ aqi: { $gt: 0 } });

    if (!sensors || sensors.length === 0) {
      // Fallback if no sensor data is available
      return 50; // Return a default 'good' or 'moderate' AQI depending on  baseline
    }

    let numerator = 0;
    let denominator = 0;

    for (const sensor of sensors) {
      const distance = haversineDistance(targetLat, targetLng, sensor.lat, sensor.lng);

      /**
       * If one of the given points are exactly on a sensor, return its exact reading
       */
      if (distance < 0.001) {
        return sensor.aqi;
      }

      // Inverse Distance Weighting formula calculation
      const weight = 1 / Math.pow(distance, power);
      numerator += weight * sensor.aqi;
      denominator += weight;
    }

    if (denominator === 0) return 50; // Avoid DivByZero

    const estimatedAQI = Math.round(numerator / denominator);
    return estimatedAQI;

  } catch (error) {
    console.error('Interpolation Error:', error.message);
    return 50; // Safe fallback
  }
};

module.exports = { calculateAQIForPoint, haversineDistance };
