const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  uid: { 
    type: String, 
    required: true,
    index: true 
  }, // Unified prefix station ID (e.g. waqi_123 or openaq_abc)
  lat: { 
    type: Number, 
    required: true 
  },
  lng: { 
    type: Number, 
    required: true 
  },
  aqi: { 
    type: Number, 
    required: true 
  },
  pm25: { 
    type: Number 
  },
  pm10: { 
    type: Number 
  },
  stationName: {
    type: String
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    expires: 86400 // TTL index: documents expire after 24 hours (86400 seconds)
  }
});

// Create a compound index for geospatial queries and time decay if needed
sensorReadingSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
