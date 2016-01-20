var debug = require('debug')('JungleBee:website-controller.js');

module.exports = {
    aboutus: function(req, res) {
        res.render('about', { page: 'about', req: req, title: 'What we do?' });
    },
    how_it_works: function(req, res) {
        res.render('howitworks', { page: 'howitworks', req: req, title: 'How It Works' });
    },
    index: function(req, res) {
        res.render('index', { page: 'home', req: req, title: 'Helping You Find Services' });
    },
};
