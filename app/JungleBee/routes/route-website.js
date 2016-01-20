var express = require('express');
var router = express.Router();
var website = require('../controllers/website-controller');
//website routes
router.use('/about', website.aboutus);
router.use('/how-it-works', website.how_it_works);
router.use('/', website.index);

module.exports = router;


