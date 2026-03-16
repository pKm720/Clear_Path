require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, connectRedis } = require('./src/config/db');
const { startAQIPoller } = require('./src/jobs/aqiPoller');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();
connectRedis();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', msg: 'ClearPath Backend is reachable.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
