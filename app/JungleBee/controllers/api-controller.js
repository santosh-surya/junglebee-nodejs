var debug = require('debug')('JungleBee:api-controller.js');
var async = require('async');
var utils = require('./utils');
module.exports = {
    authorise: function(req, res, next) {
        //check if user has permissions
        if (req.oauth){
            async.series([
                function(callback){
                    //get roles for the user
                    // debug('getting roles for '+ req.oauth.bearerToken.userId + ' '+ req.oauth.bearerToken.clientId);
                    req.app.oauthModel.findUserRoles({userId: req.oauth.bearerToken.userId, clientId: req.oauth.bearerToken.clientId}, function(err, userroles){
                        if (err) callback(err);
                        else {
                            req.userRoles = userroles;
                            callback();
                        }
                    });
                },
                function(callback){
                    // debug(req.userRoles);
                    switch (req.baseUrl) {
                        case '/api/register':
                            var roles = utils.getObjectHasKeyValues('clientId', 'JungleBeeMobileApp', req.userRoles);
                            authorised = false
                            // debug(roles);
                            for (i=0; i<roles.length; i++){
                                if (roles[i].role == 'Mobile App'){
                                    authorised = true;
                                    break;
                                }
                            }
                            if (!authorised)
                                callback('Request is not authorised');
                            else 
                                callback();
                            break;
                        default:
                            callback();
                    }
                }],
                function(err){
                    var error = {code: 400, error: 'unauthorised', error_description: 'Unauthorised to use this API'};
                    if (err){
                        next(error);
                    } else {
                        next();
                    }
                }
            );
        }else{
            var error = {code: 400, error: 'unauthorised', error_description: 'Sorry request could not be authenticated'};
            next(error);
        }
    },
    register: function(req, res, next) {
        res.json({appid: 'slslslslslls'});
        res.end();
    },
    clients: function(req, res, next) {
        req.app.oauthModel.getAllClients(function(err, clients){
        });
    }
}
