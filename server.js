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

// Trust the reverse proxy (Render load balancer) so express-rate-limit works properly
app.set('trust proxy', 1);

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

  // ─── KEEP-ALIVE PINGER ───────────────────────────────────────────────────
  // Render's Free Tier spins down any service that goes 15 minutes without
  // receiving a request. This pings both servers every 10 minutes so they
  // are ALWAYS awake and ready to serve users with zero cold-start delay.
  const https = require('https');
  const http  = require('http');

  const ping = (url) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      console.log(`[KeepAlive] Pinged ${url} → ${res.statusCode}`);
    });
    req.on('error', (err) => {
      console.warn(`[KeepAlive] Ping failed for ${url}: ${err.message}`);
    });
    req.end();
  };

  const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const ML_URL      = process.env.ML_API_URL          || 'http://127.0.0.1:8000';

  // Ping every 10 minutes (600,000 ms) — well under the 15 min kill threshold
  setInterval(() => {
    ping(`${BACKEND_URL}/api/health`);
    ping(`${ML_URL}/`);
  }, 10 * 60 * 1000);
  // ─────────────────────────────────────────────────────────────────────────
});
