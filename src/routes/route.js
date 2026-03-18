const express = require('express');
const router = express.Router();
const { calculateRoute, snapToRoute } = require('../controllers/routeController');

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

/**
 * @openapi
 * /api/route/snap:
 *   post:
 *     summary: Snap current GPS position to the nearest point on a route
 *     description: Used during navigation to handle GPS drift and calculate remaining distance.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current, path]
 *             properties:
 *               current:
 *                 type: object
 *                 properties:
 *                   lat: { type: number, example: 12.9100 }
 *                   lon: { type: number, example: 77.5670 }
 *               path:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat: { type: number }
 *                     lon: { type: number }
 *     responses:
 *       200:
 *         description: Snapped coordinate and remaining distance to destination.
 */
router.post('/snap', snapToRoute);

module.exports = router;
