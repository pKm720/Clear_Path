const { getUnifiedSensors } = require('./sensorService');
const MIN_AQI = 40;
const MAX_AQI = 160;

function getBaselineAQI(date = new Date()) {
  let aqi = 85; // base

  const month = date.getMonth() + 1;
  const hour = date.getHours();

  // Season effect
  if ([6, 7, 8, 9].includes(month)) aqi -= 20;       // Monsoon
  else if ([10, 11, 12, 1, 2].includes(month)) aqi += 20; // Winter

  // Time effect
  if (hour >= 7 && hour <= 10) aqi += 30;   // Morning rush
  else if (hour >= 13 && hour <= 17) aqi -= 15; // Afternoon clean
  else if (hour >= 18 && hour <= 21) aqi += 25; // Evening peak traffic
  else if (hour >= 0 && hour <= 5) aqi += 20;   // Night stagnation

  // Clamp
  return Math.max(MIN_AQI, Math.min(aqi, MAX_AQI));
}

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
 * Calculates the estimated AQI at a specific lat/lon using
 * Inverse Distance Weighting (IDW) interpolation.
 * 
 * @param {Number} targetLat 
 * @param {Number} targetLon 
 * @param {Array} preFetchedSensors Optional array of sensor readings
 * @param {Number} power The 'p' parameter in IDW (default 2)
 * @returns {Number} Estimated AQI
 */
const calculateAQIForPoint = async (targetLat, targetLon, preFetchedSensors = null, power = 2) => {
  try {
    // Discovery only if sensors not provided; utilizes the unified sensor hub
    const sensors = preFetchedSensors || await getUnifiedSensors();

    if (!sensors || sensors.length === 0) {
      return getBaselineAQI();
    }

    let numerator = 0;
    let denominator = 0;

    for (const sensor of sensors) {
      const distance = haversineDistance(targetLat, targetLon, sensor.lat, sensor.lng);

      if (distance < 0.001) {
        return sensor.aqi;
      }

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * sensor.aqi;
      denominator += weight;
    }

    if (denominator === 0) return getBaselineAQI();

    return Math.round(numerator / denominator);

  } catch (error) {
    console.error('Interpolation Error:', error.message);
    return getBaselineAQI();
  }
};

module.exports = { calculateAQIForPoint, haversineDistance };
