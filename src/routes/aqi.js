const express = require('express');
const router = express.Router();
const { getAQIAtPoint, getAllSensors } = require('../controllers/aqiController');

/**
 * @openapi
 * /api/aqi/sensors:
 *   get:
 *     summary: Retrieve all physical sensor readings
 *     description: Fetches the latest saved AQI data from physical monitoring stations.
 *     responses:
 *       200:
 *         description: A list of sensor readings.
 */
router.get('/sensors', getAllSensors);

/**
 * @openapi
 * /api/aqi/{lat}/{lng}:
 *   get:
 *     summary: Get estimated AQI at a specific point
 *     description: Uses IDW interpolation to estimate air quality at the provided coordinates.
 *     parameters:
 *       - in: path
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: path
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Interpolated AQI value.
 */
router.get('/:lat/:lng', getAQIAtPoint);

module.exports = router;
