var express = require('express');
var router = express.Router();
var api = require('../controllers/api-controller');
//api register new device calls
router.use('/register', api.authorise, api.register);

module.exports = router;


