const axios = require('axios');
const SensorReading = require('../models/SensorReading');

/**
 * The Sensor Intelligence Hub acts as the single source of truth for all 
 * air quality data, merging physical hardware with AI-predicted virtual sensors.
 */
const getUnifiedSensors = async () => {
  try {
    // 1. Primary Physical Fetch: Database context is required for AI calibration
    const physicalSensors = await SensorReading.find({ aqi: { $gt: 0 } }).lean();
    
    // Mapping MongoDB sensors to the context-aware format for the ML Engine
    const physicalContext = physicalSensors.map(s => ({
      name: s.stationName,
      lat: s.lat,
      lon: s.lng,
      value: s.aqi
    }));

    // 2. Context-Aware Prediction Fetch (Push Model)
    // Providing physical state to the ML engine to eliminate circular deadlocks
    let virtual_sensors = [];
    try {
      const mlApiUrl = process.env.ML_API_URL || 'http://127.0.0.1:8000';
      const mlResponse = await axios.post(`${mlApiUrl}/predict`, { 
        physical_sensors: physicalContext 
      }, { timeout: 3000 });
      
      if (mlResponse.data && mlResponse.data.data) {
        // Mapping the ML predictions to the standard SensorReading schema
        virtual_sensors = mlResponse.data.data.map(vs => ({
          uid: `virtual_${vs.location.toLowerCase().replace(/\s+/g, '_')}`,
          lat: vs.lat,
          lng: vs.lng,
          aqi: vs.predicted_pm25,
          pm25: vs.predicted_pm25,
          stationName: vs.location,
          isVirtual: true,
          status: "virtual_sensor"
        }));
      }
    } catch (err) {
      console.warn(`Sensor Intelligence Hub: ML engine timeout or unreachable (${err.message}). Using physical-only layer.`);
    }

    // 3. Merging and returning the unified air quality layer
    return [...physicalSensors, ...virtual_sensors];
    
  } catch (error) {
    console.error('Unified Sensor Service error:', error.message);
    return [];
  }
};

module.exports = { getUnifiedSensors };
