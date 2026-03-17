const express = require('express');
const router = express.Router();
const { calculateRoute } = require('../controllers/routeController');

router.post('/', calculateRoute);

module.exports = router;
