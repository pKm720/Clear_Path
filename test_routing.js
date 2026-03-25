require('dotenv').config();
const { connectRedis } = require('./src/config/db');
const { getRoutes } = require('./src/services/routingService');
const mongoose = require('mongoose');

async function test() {
  try {
    await connectRedis();
    await mongoose.connect(process.env.MONGO_URI);
    
    // Test points: Dayananda Sagar (south) and Chikkapete (central/north)
    const p1 = { lat: 12.9081, lon: 77.5552 }; // Approx Dayananda
    const p2 = { lat: 12.9734, lon: 77.5756 }; // Approx Chikkapete
    
    console.log("Fetching routes from", p1, "to", p2);
    const routes = await getRoutes(p1, p2, 'car');
    
    console.log(`Found ${routes.length} routes.`);
    for (const r of routes) {
      console.log(`[${r.mode}] distance=${r.distance}m, aqi=${r.avgAQI}, duration=${r.duration}min, nodes=${r.path.length}`);
      if (r.path.length > 5) {
        console.log(`Path preview:`, r.path.slice(0, 3), '...', r.path.slice(-3));
      } else {
        console.log('Path preview:', r.path);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
