const express = require('express');
const router = express.Router();

const controller = require('./map.controller');

router.route('/getGeoData').post(controller.getGeoData);

router.route('/getLakes').post(controller.getLakes);
router.route('/getFeatures').post(controller.getFeatures);
router.route('/getSubstancesData').post(controller.getSubstancesData);
router.route('/getLakesDensity').post(controller.getLakesDensity);

module.exports = router;