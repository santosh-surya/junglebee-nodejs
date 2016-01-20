var async = require('async');
var debug = require('debug')('JungleBee:test.js');

var req = {app: {oauthModel : require('./models/oauth2')}};

var ro = {};

function getObjectHasKeyValues(key, value, arrObject){
    var ret = new Array();
    arrObject.forEach(function(obj){
        if (obj[key] == value)
            ret.push(obj);
    });
    return ret;
}
async.series([
    function(callback){
        req.app.oauthModel.getAllUserRoles(function(err, userroles){
            if (err) debug(err);
            else {
                ro.userroles = userroles;
                callback();
            }
        }); 
        
    },
    function(callback){
        req.app.oauthModel.getAllUsers(function(err, users){
            if (err)
                callback(err);
            else {
                ro.users = users;
                for(var i=0; i<ro.users.length; i++){
                    var roles = getObjectHasKeyValues('userId', ro.users[i]._id, ro.userroles, { strict: false });
                    ro.users[i].roles = roles;
                } 
                callback();
            }
        });
    },
    function(callback){
        debug(ro.users[0].roles[0]);
    }],
    function(err){
        if (err) debug(err);
    }
)

 