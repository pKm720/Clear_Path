require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, connectRedis } = require('./src/config/db');
const { startAQIPoller } = require('./src/jobs/aqiPoller');
const aqiRoutes = require('./src/routes/aqi');
const routeRoutes = require('./src/routes/route');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.json());

// Global Rate Limiter
app.use('/api/', apiLimiter);

// Connect to Databases
connectDB();
connectRedis();

// Start Background Jobs
startAQIPoller();

// Routes
app.use('/api/aqi', aqiRoutes);
app.use('/api/route', routeRoutes);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ClearPath Backend is reachable' });
});

// Error Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
