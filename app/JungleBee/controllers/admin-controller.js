var async = require('async');
var debug = require('debug')('JungleBee:admin-controller.js');
var utils = require('./utils');


// function getObjectHasKeyValues(key, value, arrObject){
//     var ret = new Array();
//     arrObject.forEach(function(obj){
//         if (obj[key] == value)
//             ret.push(obj);
//     });
//     return ret;
// }
function createResponse(req, res, page, title){
    var ro = {};
    ro.req = req;
    ro.userRoles = new Array();
    ro.userName = 'Santosh';
    ro.page = page;
    ro.title = title;
    return ro;
}
function validateClient(req) {
    var error = '';
    if (typeof req.body.clientId == 'undefined' || req.body.clientId.length==0)
        error += 'Client Id cannot be blank! ';
    if (typeof req.body.clientSecret == 'undefined' || req.body.clientSecret.length==0)
        error += 'Client Secret cannot be blank';
    return error;
}
function validateUser (req) {
    var error = '';
    if (typeof req.body.username == 'undefined' || req.body.username.length==0)
        error += 'Username cannot be blank! ';
    if (typeof req.body.password == 'undefined' || req.body.password.length==0)
        error += 'Password cannot be blank! ';
    else {
        if (typeof req.body.confirmpassword == 'undefined' || req.body.confirmpassword.length==0) 
            error += 'Confirm Password cannot be blank! ';
        else if (req.body.password != req.body.confirmpassword) 
            error += 'Passwords do not match! ';
    }
    if (typeof req.body.firstname == 'undefined' || req.body.firstname.length==0)
        error += 'Firstname cannot be blank! ';
    if (typeof req.body.lastname == 'undefined' || req.body.lastname.length==0)
        error += 'Lastname cannot be blank! ';
    return error;
}
function validateUserRole(req){
    var error = '';
    if (req.body.userId.length<=0){
        error += 'User missing! ';
    }
    if (req.body.clientId.length<=0){
        error += 'Client missing! ';
    }
    if (req.body.role.length<=0){
        error += 'Role missing!';
    }
    return error;
}
function populateUserRoles(req, ro, origcallback){
    async.series([
        function(callback){
            req.app.oauthModel.getAllUserRoles(function(err, userroles){
                ro.userroles = userroles;                
                callback(err);
            });            
        },
        function(callback){
            async.each(ro.userroles, function(userrole, callbackdone){
                req.app.oauthModel.findUserById(userrole.userId, function(err, user){
                    if (err) callbackdone(err);
                    else {
                        userrole.firstname = user.firstname;
                        userrole.lastname = user.lastname;
                        callbackdone();
                    }
                });
                
            },
            function(err){
                if (err) debug(err);
                callback();
            });
        }],
        function(err){
            if (err) debug(err);
            origcallback(err);
        }
    );
}
function populateClients(req, ro, origcallback){
    async.series([
        function(callback){
            req.app.oauthModel.getAllClients(function(err, clients){
                ro.clients = clients; 
                // debug('clients returned');
                callback(err);
            });            
        }],
        function(err){
            if (err) debug(err);
            origcallback(err);
        }
    );
}
function populateUsers(req, ro, origcallback){
    var ret = [];
    async.series([
        function(callback){
            req.app.oauthModel.getAllUsers(function(err, users){
                ro.users = users; 
                // debug('users returned');
                callback(err);
            });            
        }],
        function(err){
            if (err) debug(err);
            origcallback(err);
        }
    );
}
function populateRoles(req, ro, origcallback){
    // ROLE MANAGEMENT
    ro.roles = [
        {name: 'Super Admin'}, 
        {name: 'Admin'}, 
        {name: 'Mobile App'}
    ];
    origcallback();
}

module.exports = {
    authorise: function(req, res, next) {
        //check if user has permissions
        if (!req.session.userId){
            res.redirect('/admin/login?error=You must be logged in.&redirect='+req.originalUrl);
            res.end();
        }else{
            switch (req.baseUrl) {
                case '/admin/dashboard':
                    if (req.session.userRoles){
                        
                    }
                    var roles = utils.getObjectHasKeyValues('clientId', 'JungleBeeAdmin', req.session.userRoles);
                    authorised = false;
                    for (i=0; i<roles.length; i++){
                        if (roles[i].role == 'Super Admin'){
                            authorised = true;
                            break;
                        }
                    }
                    if (!authorised){
                        res.redirect('/admin/login?error=Authorisation Not Setup for this URL&redirect='+req.originalUrl);
                        res.end();
                    }
                    break;
                case '/admin/users':
                    break;
                case '/admin/user-roles':
                    break;
                case '/admin/clients':
                    break;
                default:
                    res.redirect('/admin/login?error=Authorisation Not Setup for this URL&redirect='+req.originalUrl);
                    res.end();
            }
            next();
        }
    },
    logout: function(req, res, next) {
        req.session.userId = null;
        req.session = null;
        var ro = createResponse(req, res, 'login', 'User Login');
        res.redirect('/admin/login');
    },
    login: function(req, res, next) {
        var ro = createResponse(req, res, 'login', 'User Login');
        ro.username = '';
        if (req.method == 'POST'){
            if (req.body.username.length>0 && req.body.password.length>0){
                async.series([
                    function(callback){
                        populateUsers(req, ro, function(err, users){
                            if (ro.users.length==0){
                                debug('no users found');
                                req.session.userId = 'new user';
                                req.session.userName = 'No Users';
                                req.session.clientId = req.clientId;
                                req.session.accessToken = '';
                                // debug(req.session);
                                res.redirect('/admin/clients');
                                res.end();
                                
                            }else{
                                callback();
                            }
                        });
                    },
                    function(callback){
                        req.app.oauth.login(req, res, function(err){
                            if(err){ 
                                callback(err);
                            } else {
                                ro.message = 'Login successful';
                                callback();
                            }
                        });
                    },
                    function(callback){
                        //get roles for the user
                        req.app.oauthModel.findUserRoles({userId: req.oauth.user._id, clientId: 'JungleBeeAdmin'}, function(err, userroles){
                            if (err) callback(err);
                            else {
                                if (userroles) req.session.userRoles = userroles;
                                callback();
                            }
                        })
                    }],
                    function(err){
                        if (err){
                            // debug(err.message);
                            ro.error = err.message;
                            res.render('admin/admin', ro);
                        } else {
                            ro.message = 'Login successful';
                            req.session.userId = req.oauth.user._id;
                            req.session.userName = req.oauth.user.firstname + ' ' + req.oauth.user.lastname;
                            
                            req.session.clientId = req.clientId;
                            req.session.accessToken = req.accessToken;
                            // debug(req.session);
                            res.redirect('/admin/dashboard');
                            res.end();
                        }
                    }
                )
            }else{
                ro.error = 'Username and password must be provided.';
                res.render('admin/admin', ro);
            }
        }else{
            // debug(req.query);
            if (req.query.error){
                ro.error = req.query.error;
            }
            res.render('admin/admin', ro);
        }
        
    },
    dashboard: function(req, res, next) {
        var ro = createResponse(req,res, 'dashboard', 'Dashboard');
        async.series([
            function (callback){
                req.app.oauthModel.getAllClients(function(err, clients){
                    ro.clients = clients; 
                    callback(err);
                });
            },
            function (callback){
                req.app.oauthModel.getAllUsers(function(err, users){
                    ro.users = users; 
                    callback(err);
                });
            },
            function (callback){
                req.app.oauthModel.getAllUserRoles(function(err, userroles){
                    ro.userroles = userroles; 
                    callback(err);
                });
            }],
            function(err){
                if (err)
                    ro.error = err;
                res.render('admin/admin', ro);
            }
        );
    },
    users: function(req, res) {
        var ro = createResponse(req, res, 'users', 'User Management');
        switch(req.path) {
        case '/add':
            ro.username = '';
            ro.password = '';
            ro.confirmpassword = '';
            ro.firstname = '';
            ro.lastname = '';
            ro.email = '';
            
            if (req.method=='POST'){
                debug('is post');
                ro.username = req.body.username;
                ro.password = req.body.password;
                ro.confirmpassword = req.body.confirmpassword;
                ro.firstname = req.body.firstname;
                ro.lastname = req.body.lastname;
                ro.email = req.body.email;
                //is it a new user
                if (typeof req.body.id == 'undefined'){
                    // debug('creating a new user');
                    var error = validateUser(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'user-edit';
                        ro.title = 'Add New User';
                        ro.type = 'add';
                        
                        res.render('admin/admin', ro);
                    } else {
                        // ro.debug = JSON.stringify(req.body, null, 2);
                        async.series([
                            function(callback){
                                req.app.oauthModel.addUser(req.body.username, req.body.password, req.body.firstname, req.body.lastname, req.body.email, function(err){
                                    if (err)
                                        callback(err);
                                    else
                                        callback();
                                });
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                    res.render('admin/admin', ro);
                                }else{
                                    res.redirect('/admin/users?message=User Edited successfully');
                                    res.end();
                                }
                            }
                        );
                    }
                }else{
                    ro.id = req.body.id;
                    // debug('editing user id: '+ro.id);
                    //check data validity
                    var error = validateUser(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'user-edit';
                        ro.title = 'Edit User';
                        ro.type = 'edit';
                        res.render('admin/admin', ro);
                    } else {
                        async.series([
                            function(callback){
                                req.app.oauthModel.findUserById(req.body.id, function(err, user){
                                    if (err)
                                        callback(err);
                                    else {
                                        user.username = ro.username;
                                        user.password = ro.password;
                                        user.firstname = ro.firstname;
                                        user.lastname = ro.lastname;
                                        user.email = ro.email;
                                        user.save(function(err) {
                                            if (err)
                                                callback(err);
                                            else
                                                callback();
                                        });
                                    }
                                });
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                    res.render('admin/admin', ro);
                                }else{
                                    ro.message = 'User Edited successfully';
                                    res.redirect('/admin/users?message=User Edited successfully');
                                    res.end();
                                }
                            }
                        )
                    }                    
                }
            }else{
                if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                    // debug('edit user: '+req.query.id);
                    async.series([
                        function(callback){
                            req.app.oauthModel.findUserById(req.query.id, function(err, user){
                                if (err) {
                                    ro.error = 'User not found';
                                    callback(err);
                                } else {
                                    // debug(user);
                                    ro.page = 'user-edit';
                                    ro.title = 'Edit User';
                                    ro.type = 'edit';
                                    ro.id = user._id;
                                    ro.username = user.username;
                                    ro.password = user.password;
                                    ro.confirmpassword = user.password;
                                    ro.firstname = user.firstname;
                                    ro.lastname = user.lastname;
                                    ro.email = user.email;
                                    callback();
                                }
                            });
                        }],
                        function(err){
                            if (err)
                                ro.error = err;
                            res.render('admin/admin', ro);
                        }
                    )
                    
                }else{
                    //render blank new uer page
                    ro.page = 'user-edit';
                    ro.title = 'Add New User';
                    ro.type = 'add';
                    res.render('admin/admin', ro);
                }
            }
            break;
        case '/delete':
            if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                async.series([
                    function(callback){
                        req.app.oauthModel.deleteUser(req.query.id, function(err){
                            if (err){
                                ro.error = err;
                                callabck(err);
                            } else {
                                ro.message = 'User deleted successfully';
                                callback();
                            }
                        });
                        
                    },
                    function(callback){
                        req.app.oauthModel.getAllUserRoles(function(err, userroles){
                            ro.userroles = userroles;                
                            callback(err);
                        });            
                    },
                    function(callback){
                        req.app.oauthModel.getAllUsers(function(err, users){
                            if (err)
                                callback(err);
                            else {
                                ro.users = users;
                                for(var i=0; i<ro.users.length; i++){
                                    var roles = utils.getObjectHasKeyValues('userId', ro.users[i]._id, ro.userroles, { strict: false });
                                    ro.users[i].roles = roles;
                                } 
                                callback();
                            }
                        });
                    }],
                    function(err){
                        if (err)
                            ro.error = err;
                        res.render('admin/admin', ro);
                    }
                )
            }
        default:
            async.series([
                function(callback){
                    req.app.oauthModel.getAllUserRoles(function(err, userroles){
                        ro.userroles = userroles;                
                        callback(err);
                    });            
                },
                function(callback){
                    req.app.oauthModel.getAllUsers(function(err, users){
                        if (err)
                            callback(err);
                        else {
                            ro.users = users;
                            debug(users);
                            debug(ro.userrole);
                            for(var i=0; i<ro.users.length; i++){
                                var roles = utils.getObjectHasKeyValues('userId', ro.users[i]._id, ro.userroles, { strict: false });
                                ro.users[i].roles = roles;
                            } 
                            callback();
                        }
                    });
                }],
                function(err){
                    if (err)
                        ro.error = err;
                    res.render('admin/admin', ro);
                }
            )
            break;
        }
    },
    userroles: function(req, res) {
        var ro = createResponse(req, res, 'user-roles', 'User Role Management');
        
        switch(req.path) {
        case '/add':
            ro.userId = '';
            ro.clientId = '';
            ro.role = '';
            if (req.method=='POST'){
                ro.userId = req.body.userId;
                ro.clientId = req.body.clientId;
                ro.role = req.body.role;
                //is it a new user
                if (typeof req.body.id == 'undefined'){
                    // debug('creating a new user role');
                    var error = validateUserRole(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'user-role-edit';
                        ro.title = 'Add New User Role';
                        ro.type = 'add';
                        async.series([
                            function(callback){
                                populateUsers(req, ro, callback);
                            },
                            function(callback){
                                populateClients(req, ro, callback);
                            },
                            function(callback){
                                populateRoles(req, ro, callback);
                            }],
                            function(err){
                                if (err) debug(err);
                                res.render('admin/admin', ro);
                                // debug('rendered page');
                            }
                        );
                    } else {
                        async.series([
                            function(callback){                                
                                req.app.oauthModel.findUserRole({userId: req.body.userId, clientId: req.body.clientId, role: req.body.role}, function(err, userrole){
                                    if (err)
                                        callback(err);
                                    else if(userrole)
                                        callback('Duplicate role for the user is not allowed!');
                                    else
                                        callback();
                                });
                            },
                            function(callback){
                                req.app.oauthModel.addUserRole(req.body.userId, req.body.clientId, req.body.role, function(err){
                                    if (err)
                                        callback(err);
                                    else
                                        callback();
                                });
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                    ro.page = 'user-role-edit';
                                    ro.title = 'Add New User Role';
                                    ro.type = 'add';
                                    async.series([
                                        function(callback){
                                            populateUsers(req, ro, callback);
                                        },
                                        function(callback){
                                            populateClients(req, ro, callback);
                                        },
                                        function(callback){
                                            populateRoles(req, ro, callback);
                                        }],
                                        function(err){
                                            if (err) debug(err);
                                            res.render('admin/admin', ro);
                                        }
                                    )
                                }else{
                                    ro.message = 'New User Role Added successfully';
                                    res.redirect('/admin/user-roles?message=New User Role Added successfully');
                                }
                            }
                        );
                    }
                }else{
                    ro.id = req.body.id;
                    // debug('editing user role id: '+ro.id);
                    //check data validity
                    var error = validateUserRole(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'user-role-dit';
                        ro.title = 'Edit User Role';
                        ro.type = 'edit';
                        async.series([
                            function(callback){
                                populateUsers(req, ro, callback);
                            },
                            function(callback){
                                populateClients(req, ro, callback);
                            },
                            function(callback){
                                populateRoles(req, ro, callback);
                            }],
                            function(err){
                                if (err) debug(err);
                                res.render('admin/admin', ro);
                            }
                        )
                    } else {
                        var thisuserrole = null;
                        async.series([
                            function(callback){                                
                                req.app.oauthModel.findUserRoleById(req.body.id, function(err, urole){
                                    if (err)
                                        callback(err);
                                    else {
                                        thisuserrole = urole;
                                        callback();
                                    }
                                });
                            },
                            function(callback){                                
                                req.app.oauthModel.findUserRoles({userId: req.body.userId, clientId: req.body.clientId, role: req.body.role}, function(err, userroles){
                                    if (err)
                                        callback(err);
                                    else {
                                        var found = false;
                                        for(var i=0; i<userroles.length; i++){
                                            if (userroles[i]._id != req.body.id){
                                                // debug('found other role '+ userroles[i]._id);
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (found)
                                            callback('Duplicate role for the user is not allowed!');
                                        else
                                            callback();
                                    }
                                });
                            },
                            function(callback){
                                thisuserrole.userId = ro.userId;
                                thisuserrole.clientId = ro.clientId;
                                thisuserrole.role = ro.role;
                        
                                thisuserrole.save(function(err) {
                                    if (err)
                                        callback(err);
                                    else
                                        callback();
                                });
                                
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                    async.series([
                                        function(callback){
                                            populateUserRoles(req, ro, callback);
                                        },
                                        function(callback){
                                            populateUsers(req, ro, callback);
                                        },
                                        function(callback){
                                            populateClients(req, ro, callback);
                                        },
                                        function(callback){
                                            populateRoles(req, ro, callback);
                                        }],
                                        function(err){
                                            if (err) debug(err);
                                            res.render('admin/admin', ro);
                                        }
                                    )
                                }else{
                                    ro.message = 'User Role Edited successfully';
                                    res.redirect('/admin/user-roles?message=New User Role Edited successfully');
                                }
                            }
                        )
                    }                    
                }
            }else{
                if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                    // debug('edit user role: '+req.query.id);
                    async.series([
                        function(callback){
                            req.app.oauthModel.findUserRoleById(req.query.id, function(err, userrole){
                                if (err) {
                                    ro.error = 'User Role not found';
                                    callback(err);
                                } else {
                                    ro.page = 'user-role-edit';
                                    ro.title = 'Edit User Role';
                                    ro.type = 'edit';
                                    ro.id = userrole._id;
                                    ro.userId = userrole.userId;
                                    ro.clientId = userrole.clientId;
                                    ro.role = userrole.role;
                                    async.series([
                                        function(callbackdone){
                                            populateUsers(req, ro, callbackdone);
                                        },
                                        function(callbackdone){
                                            populateClients(req, ro, callbackdone);
                                        },
                                        function(callbackdone){
                                            populateRoles(req, ro, callbackdone);
                                        }],
                                        function(err){
                                            if (err) debug(err);
                                            res.render('admin/admin', ro);
                                            callback();
                                            
                                        }
                                    )
                                }
                            });
                        }],
                        function(err){
                            if (err)
                                ro.error = err;
                        }
                    )
                    
                }else{
                    //render blank new uer page
                    ro.page = 'user-role-edit';
                    ro.title = 'Add New User Role';
                    ro.type = 'add';
                    async.series([
                        function(callback){
                            populateUsers(req, ro, callback);
                        },
                        function(callback){
                            populateClients(req, ro, callback);
                        },
                        function(callback){
                            populateRoles(req, ro, callback);
                        }],
                        function(err){
                            if (err) debug(err);
                            res.render('admin/admin', ro);
                        }
                    )
                }
            }
            break;
        case '/delete':
            if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                async.series([
                    function(callback){
                        req.app.oauthModel.deleteUserRole(req.query.id, function(err){
                            if (err){
                                ro.error = err;
                                callabck(err);
                            } else {
                                ro.message = 'User Role deleted successfully';
                                callback();
                            }
                        });
                        
                    }],
                    function(err){
                        if (err)
                            ro.error = err;
                        else
                            res.redirect('/admin/user-roles?message=New User Role Deleted successfully');
                    }
                )
            }
        default:
            async.series([
                function(callback){
                    populateUserRoles(req, ro, callback);
                },
                function(callback){
                    populateUsers(req, ro, callback);
                },
                function(callback){
                    populateClients(req, ro, callback);
                },
                function(callback){
                    populateRoles(req, ro, callback);
                }],
                function(err){
                    if (err) debug(err);
                    res.render('admin/admin', ro);
                }
            )
            break;
        }
    },
    suppliers: function(req, res) {
        res.render('admin/admin',createResponse(req,res, 'suppliers', 'Supplier Management'));
        res.end();
    },
    clients: function(req, res) {
        var ro = createResponse(req, res, 'clients', 'Client Management');
        switch(req.path) {
        case '/add':
            ro.clientid = '';
            ro.clientsecret = '';
            
            if (req.method=='POST'){
                // debug('is post');
                ro.clientid = req.body.clientId;
                ro.clientsecret = req.body.clientSecret;
                //is it a new client
                if (typeof req.body.id == 'undefined'){
                    // debug('creating a new client');
                    var error = validateClient(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'client-edit';
                        ro.title = 'Add New Client';
                        ro.type = 'add';
                        res.render('admin/admin', ro);
                    } else {
                        async.series([
                            function(callback){
                                req.app.oauthModel.addClient(req.body.clientId, req.body.clientSecret, function(err){
                                    if (err)
                                        callback(err);
                                    else
                                        callback();
                                });
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                    ro.page = 'client-edit';
                                    ro.title = 'Add New Client';
                                    ro.type = 'add';
                                }else{
                                    ro.message = 'New Client Added successfully';
                                }
                                req.app.oauthModel.getAllClients(function(err, clients){
                                    ro.clients = clients; 
                                    res.render('admin/admin', ro);
                                });
                            }
                        );
                    }
                }else{
                    ro.id = req.body.id;
                    // debug('editing client id: '+ro.id);
                    //check data validity
                    var error = validateClient(req);
                    if (error.length>0) {
                        ro.error = error;
                        ro.page = 'client-edit';
                        ro.title = 'Edit Client';
                        ro.type = 'edit';
                        res.render('admin/admin', ro);
                    } else {
                        async.series([
                            function(callback){
                                req.app.oauthModel.findClientById(req.body.id, function(err, client){
                                    if (err)
                                        callback(err);
                                    else {
                                        client.clientId = ro.clientid;
                                        client.clientSecret = ro.clientsecret;
                                        // debug(client);
                                        client.save(function(err) {
                                            if (err)
                                                callback(err);
                                            else
                                                callback();
                                        });
                                    }
                                });
                            }],
                            function(err){
                                if (err){
                                    ro.error = err;
                                }else{
                                    ro.message = 'Client Updated successfully';
                                }
                                async.series([
                                    function(callback){
                                        req.app.oauthModel.getAllClients(function(err, clients){
                                            if (err)
                                                callback(err);
                                            else {
                                                ro.clients = clients; 
                                                callback();
                                            }
                                        });
                                    }],
                                    function(err){
                                        if (err)
                                            ro.error = err;
                                        res.render('admin/admin', ro);
                                    }
                                )
                            }
                        )
                    }                    
                }
            }else{
                if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                    // debug('edit client: '+req.query.id);
                    async.series([
                        function(callback){
                            req.app.oauthModel.findClientById(req.query.id, function(err, client){
                                if (err) {
                                    ro.error = 'Client not found';
                                    callback(err);
                                } else {
                                    // debug(client);
                                    ro.page = 'client-edit';
                                    ro.title = 'Edit Client';
                                    ro.type = 'edit';
                                    ro.id = client._id;
                                    ro.clientid = client.clientId;
                                    ro.clientsecret = client.clientSecret;
                                    callback();
                                }
                            });
                        }],
                        function(err){
                            if (err)
                                ro.error = err;
                            res.render('admin/admin', ro);
                        }
                    )
                    
                }else{
                    //render blank new uer page
                    ro.page = 'client-edit';
                    ro.title = 'Add New Client';
                    ro.type = 'add';
                    res.render('admin/admin', ro);
                }
            }
            break;
        case '/delete':
            if (typeof req.query.id != 'undefined' && req.query.id.length>0){
                async.series([
                    function(callback){
                        req.app.oauthModel.deleteClient(req.query.id, function(err){
                            if (err){
                                ro.error = err;
                                callback(err);
                            } else {
                                ro.message = 'Client deleted successfully';
                                callback();
                            }
                        });
                        
                    },
                    function(callback){
                        req.app.oauthModel.getAllClients(function(err, clients){
                            if (err)
                                callback(err);
                            else {
                                ro.clients = clients; 
                                callback();
                            }
                        });
                    }],
                    function(err){
                        if (err)
                            ro.error = err;
                        res.render('admin/admin', ro);
                    }
                )
            }
        default:
            async.series([
                function(callback){
                    req.app.oauthModel.getAllClients(function(err, clients){
                        if (err)
                            callback(err);
                        else {
                            ro.clients = clients; 
                            callback();
                        }
                    });
                }],
                function(err){
                    if (err)
                        ro.error = err;
                    res.render('admin/admin', ro);
                }
            )
            break;
        }
    }
    
};
