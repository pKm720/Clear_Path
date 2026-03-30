require('dotenv').config();
const { connectRedis, connectDB } = require('./src/config/db');
const { buildGraph } = require('./src/services/graphService');

async function run() {
  try {
    console.log('Connecting to databases...');
    await connectDB();
    await connectRedis();
    
    console.log('Starting graph rebuild (may take 1-2 minutes for full city data)...');
    console.time('Graph Rebuild');
    const success = await buildGraph();
    console.timeEnd('Graph Rebuild');
    
    if (success) {
      console.log('Graph rebuild completed successfully!');
    } else {
      console.error('Graph rebuild failed.');
    }
  } catch (err) {
    console.error('Fatal error during graph rebuild:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
