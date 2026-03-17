const rateLimit = require('express-rate-limit');

/**
 * Basic rate limiting middleware.
 * Limits each IP to 100 requests per 15 minutes.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

module.exports = { apiLimiter };
