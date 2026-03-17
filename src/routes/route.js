const express = require('express');
const router = express.Router();
const { calculateRoute } = require('../controllers/routeController');

/**
 * @openapi
 * /api/route:
 *   post:
 *     summary: Calculate healthy routes between two points
 *     description: Computes Cleanest, Fastest, and Balanced routes using A* and real-time AQI weights.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start:
 *                 type: object
 *                 properties:
 *                   lat: { type: number }
 *                   lon: { type: number }
 *               end:
 *                 type: object
 *                 properties:
 *                   lat: { type: number }
 *                   lon: { type: number }
 *     responses:
 *       200:
 *         description: Array of calculated routes with stats.
 */
router.post('/', calculateRoute);

module.exports = router;
