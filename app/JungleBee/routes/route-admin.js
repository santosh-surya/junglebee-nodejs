var express = require('express');
var router = express.Router();
var admin = require('../controllers/admin-controller');

//admin routes
router.use('/dashboard', admin.authorise, admin.dashboard);
router.use('/users', admin.authorise, admin.users);
router.use('/user-roles', admin.authorise, admin.userroles);
router.use('/suppliers', admin.authorise, admin.suppliers);
router.use('/clients', admin.authorise, admin.clients);
router.use('/login', admin.login);
router.use('/logout', admin.logout);

module.exports = router;


