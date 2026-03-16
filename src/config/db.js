const mongoose = require('mongoose');
const { createClient } = require('redis');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Connected'));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis Connection Error:', err.message);
  }
}

module.exports = { connectDB, connectRedis, redisClient };
