const cron = require('node-cron');
const { fetchBengaluruAQI } = require('../services/aqiService');
const SensorReading = require('../models/SensorReading');

/**
 * The Heartbeat: Polls AQI data from WAQI every 15 minutes.
 * Overwrites old data or just inserts new timestamped readings.
 */
const startAQIPoller = () => {
  // Run instantly on startup
  console.log('Starting initial AQI poll...');
  runPoll();

  // Then schedule every 15 minutes: */15 * * * *
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running 15-minute AQI poll...');
    await runPoll();
  });
};

const runPoll = async () => {
  try {
    const readings = await fetchBengaluruAQI();

    if (readings && readings.length > 0) {
      // Upsert based on sensor UID so we keep updating the latest reading for each station
      // Or just insert new documents to keep history. We'll just insert and let TTL expire old ones.

      const bulkOps = readings.map(r => ({
        updateOne: {
          filter: { uid: r.uid }, // WAQI station ID
          update: { $set: r },
          upsert: true
        }
      }));

      const result = await SensorReading.bulkWrite(bulkOps);
      console.log(`AQI Poll Complete. Updated/Inserted ${result.upsertedCount + result.modifiedCount} stations.`);
    } else {
      console.log('No valid AQI readings fetched from WAQI.');
    }
  } catch (err) {
    console.error('AQI Poller Error:', err.message);
  }
};

module.exports = { startAQIPoller };
