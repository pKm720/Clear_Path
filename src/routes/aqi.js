const express = require('express');
const router = express.Router();
const { getAQIAtPoint, getAllSensors } = require('../controllers/aqiController');

router.get('/sensors', getAllSensors);
router.get('/:lat/:lng', getAQIAtPoint);

module.exports = router;
