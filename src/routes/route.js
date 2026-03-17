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
 *             required: [start, end]
 *             properties:
 *               start:
 *                 type: object
 *                 properties:
 *                   lat: { type: number, example: 12.9095 }
 *                   lon: { type: number, example: 77.5668 }
 *               end:
 *                 type: object
 *                 properties:
 *                   lat: { type: number, example: 12.9218 }
 *                   lon: { type: number, example: 77.6144 }
 *               transport:
 *                 type: string
 *                 enum: [car, motorbike, pedestrian]
 *                 default: car
 *                 description: Transport mode affects accessible roads and journey speed.
 *     responses:
 *       200:
 *         description: Array of calculated routes (cleanest, balanced, fastest) with stats.
 */
router.post('/', calculateRoute);

module.exports = router;
