var express = require('express');
var mongoose = require('mongoose');
var responsive = require('express-responsive');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var debug = require('debug')('JungleBee:app.js');

// var session = require('express-session')
Array.prototype.findValue = function(name, value){
   var array = $.map(this, function(v,i){
        var haystack = v[name];
        var needle = new RegExp(value);
        // check for string in haystack
        // return the matched item if true, or null otherwise
      return needle.test(haystack) ? v : null;
   });
  return this;
}

var bodyParser = require('body-parser');
var oauthserver = require('oauth2-server');

var app = express();

app.locals.appname = "Jungle Bee Working Hard for You"
app.user = require('./models/user');

debug('app starting');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(responsive.deviceCapture());

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// app.use(session({ name: 'junglebee', secret: 'keyboard cat', resave: false, saveUninitialized: false, cookie: { maxAge: 60000 }}));
app.use(cookieSession({
    name: 'junglebee',
    path: '/',
    secret: 'ahshshshleieinhdl',
    maxAge: 3600000
}));
app.use(express.static(path.join(__dirname, 'public')));

// // Connect to the JungleBee MongoDB
// var uristring = 'mongodb://localhost/junglebee';
//
// mongoose.createConnection(uristring, function (err, res) {
//     if (err) {
//         console.log ('ERROR connecting to: ' + uristring + '. ' + err);
//     } else {
//         console.log ('Succeeded connected to: ' + uristring);
//     }
// });

//oauth2 server integration
app.oauthModel = require('./models/oauth2');
app.oauth = oauthserver({
    model: app.oauthModel,
    grants: ['password'],
    debug: true
});
//generate tokens
app.all('/oauth/token', app.oauth.grant());
 
app.use(app.oauth.errorHandler());

var api = require('./routes/route-api');
var admin = require('./routes/route-admin');
var website = require('./routes/route-website');

app.use('/api', app.oauth.authorise(), api);
app.use('/admin', admin);
app.use('/', website);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
      if (req.path.indexOf('/admin/login') == 0){
          res.render('admin/error', { req: req, userRole: '', username: '', page: 'login', title: 'Error ... ', error: err});
          res.end();
      }else if (req.path.indexOf('/api/') == 0){
          res.jsonp({code: err.code, error: err.error, error_description: err.error_description});
          res.end();
      } else {
          res.status(err.status || 500);
          res.render('error', {
            message: err.message,
            error: err
          });
      }
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
