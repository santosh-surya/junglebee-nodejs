/**
 * Copyright 2013-present NightWorld.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var mongoose = require('mongoose'),
  async = require('async'),
  Schema = mongoose.Schema,
  model = module.exports;
var debug = require('debug')('JungleBee:oauth2.js');
  

var uristring = 'mongodb://localhost/oauth2';

// Makes connection asynchronously. Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
    if (err) {
        debug('ERROR connecting to: ' + uristring + '. ' + err);
    } else {
        debug('Succeeded connected to: ' + uristring);
    }
});
//
// Schemas definitions
//
var OAuthAccessTokensSchema = new mongoose.Schema({
  accessToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

var OAuthRefreshTokensSchema = mongoose.Schema({
  refreshToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

var OAuthClientsSchema = new mongoose.Schema({
  clientId: { type: String },
  clientSecret: { type: String },
  redirectUri: { type: String }
});

var OAuthUsersSchema = new mongoose.Schema({
  username: { type: String },
  password: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  email: { type: String, default: '' }
});

var OAuthUserRolesSchema = new mongoose.Schema({
    userId: { type: String },
    clientId: { type: String },
    role: { type: String }
});

mongoose.model('OAuthAccessTokens', OAuthAccessTokensSchema);
mongoose.model('OAuthRefreshTokens', OAuthRefreshTokensSchema);
mongoose.model('OAuthClients', OAuthClientsSchema);
mongoose.model('OAuthUsers', OAuthUsersSchema);
mongoose.model('OAuthUserRoles', OAuthUserRolesSchema);

var OAuthAccessTokensModel = mongoose.model('OAuthAccessTokens', OAuthAccessTokensSchema),
    OAuthRefreshTokensModel = mongoose.model('OAuthRefreshTokens', OAuthRefreshTokensSchema),
    OAuthClientsModel = mongoose.model('OAuthClients', OAuthClientsSchema),
    OAuthUsersModel = mongoose.model('OAuthUsers', OAuthUsersSchema),
    OAuthUserRolesModel = mongoose.model('OAuthUserRoles', OAuthUserRolesSchema);

//
// oauth2-server callbacks
//
module.exports.getAccessToken = function (bearerToken, callback) {
  // debug('in getAccessToken (bearerToken: ' + bearerToken + ')');
  async.series([
      function(callbak){
          OAuthAccessTokensModel.findOne({ accessToken: bearerToken }, function(err, token){
              if (err)
                  callback(err);
              else
                  callback(null, token);
          });
      }],
      function(err){
          
      }
  );
};

module.exports.getClient = function (clientId, clientSecret, callback) {
  // debug('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
  if (clientSecret === null) {
    return OAuthClientsModel.findOne({ clientId: clientId }, callback);
  }
  OAuthClientsModel.findOne({ clientId: clientId, clientSecret: clientSecret }, callback);
};
// Santosh added
module.exports.getAllClients = function (callback) {
    OAuthClientsModel.find(callback);
};
//get a user to edit
module.exports.findClientById = function (id, callback) {
    OAuthClientsModel.findOne({ _id: id}, function(err, client) {
      if(err) return callback(err);
      callback(null, client);
    });
};

module.exports.addClient = function (clientId, clientSecret, callback) {
  // debug('in add Client (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
  var thisClient = null;
  async.series([
      function(callback){
          OAuthClientsModel.findOne({clientId: clientId}, function(err, client){
              if (err) {
                  debug('error in findOne '+err);
                  callback(err);
              }
              if (client) {
                  debug('found existing client');
                  callback('Sorry, clientId: "'+clientId+'" already exists');
              }else{
                  debug('no client found');
                  callback();
              }
          });
      },
      function(callback){
          debug('new client being added.');
          var client = new OAuthClientsModel();
          client.clientId = clientId;
          client.clientSecret = clientSecret;
          client.clientUri = '';
          client.save(function(err) {
              if (err)
                  callback(err);
              else
                  callback();
            });
      }],
      function(err){
          if (err){
              callback(err);
          } else {
              callback();
          }
      }
  );
  
};

module.exports.deleteClient = function(id, callback){
    OAuthClientsModel.remove({_id: id}, function(err){
        if (err)
            callback(err.message); 
        else
            callback();
    });
};
// -- end 
// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
var authorizedClientIds = ['s6BhdRkqt3', 'toto', 'JungleBee'];
module.exports.grantTypeAllowed = function (clientId, grantType, callback) {
  // debug('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

  if (grantType === 'password') {
      return callback(false, true);
    // return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
  }

  callback(false, true);
};

module.exports.saveAccessToken = function (token, clientId, expires, userId, callback) {
  // debug('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

  var accessToken = new OAuthAccessTokensModel({
    accessToken: token,
    clientId: clientId,
    userId: userId,
    expires: expires
  });

  accessToken.save(callback);
};

/*
 * Required to support password grant type
 */
module.exports.getUser = function (username, password, callback) {
  // debug('in getUser (username: ' + username + ', password: ' + password + ')');

  OAuthUsersModel.findOne({ username: username, password: password }, function(err, user) {
    if(err) callback(err);
    else if(user) callback(null, user._id);
    else callback(null, null);
    
  });
};
module.exports.getUserObject = function (username, password, callback) {
  // debug('in getUserObject (username: ' + username + ', password: ' + password + ')');

  OAuthUsersModel.findOne({ username: username, password: password }, function(err, user) {
    if(err) callback(err);
    else if(user) callback(null, user);
    else callback(null, null);
    
  });
};
//get all users;
module.exports.getAllUsers = function (callback) {
    OAuthUsersModel.find().lean().exec(callback);
};
//get a user to edit
module.exports.findUserById = function (id, callback) {
    OAuthUsersModel.findOne({ _id: id}, function(err, user) {
      if(err) return callback(err);
      callback(null, user);
    });
};

module.exports.addUser = function (username, password, firstname, lastname, email, callback) {
  // debug('in add User (username: ' + username + ', password: ' + password + ', firstname: ' + firstname + ', lastname: ' + lastname + ', email: ' + email + ')');
  async.series([
      function(callback){
          OAuthUsersModel.findOne({username: username}, function(err, user){
              if (err) {
                  debug('error in findOne '+err);
                  callback(err);
              }
              if (user) {
                  debug('found existing user');
                  callback('Sorry, username: "'+username+'" already exists');
              }else{
                  debug('no user found');
                  callback();
              }
          });
      },
      function(callback){
          debug('new user being added.');
          var user = new OAuthUsersModel();
          user.username = username;
          user.password = password;
          user.firstname = firstname;
          user.lastname = lastname;
          user.email = email;
          
          user.save(function(err) {
              if (err)
                  callback(err);
              else
                  callback();
            });
      }],
      function(err){
          if (err){
              callback(err);
          } else {
              callback();
          }
      }
  );
  
};

module.exports.deleteUser = function(id, callback){
    OAuthUsersModel.remove({_id: id}, function(err){
        if (err)
            callback(err.message); 
        else
            callback();
    });
};

//user roles
//get all users;
module.exports.getAllUserRoles = function (callback) {
    OAuthUserRolesModel.find(callback);
};
//get a user to edit
module.exports.findUserRoleById = function (id, callback) {
    OAuthUserRolesModel.findOne({ _id: id}, function(err, userrole) {
      if(err) return callback(err);
      callback(null, userrole);
    });
};
//get all user roles
module.exports.findUserRoles = function (criteria, callback) {
    OAuthUserRolesModel.find(criteria, function(err, userroles) {
      if(err) return callback(err);
      callback(null, userroles);
    });
};
//get one user
module.exports.findUserRole = function (criteria, callback) {
    OAuthUserRolesModel.findOne(criteria, function(err, userrole) {
      if(err) return callback(err);
      callback(null, userrole);
    });
};

module.exports.addUserRole = function (userId, clientId, role, callback) {
  async.series([
      function(callback){
          OAuthUserRolesModel.findOne({userId: userId, clientId: clientId}, function(err, user){
              if (err) {
                  debug('error in find One User Role '+err);
                  callback(err);
              }
              if (user) {
                  debug('found existing user role');
                  callback('Sorry, this user ['+userId+'] already has the role ['+role+'] for given client ['+clientId+'].');
              }else{
                  debug('no user found');
                  callback();
              }
          });
      },
      function(callback){
          debug('new user role being added.');
          var userrole = new OAuthUserRolesModel();
          userrole.userId = userId;
          userrole.clientId = clientId;
          userrole.role = role;
          
          user.save(function(err) {
              if (err)
                  callback(err);
              else
                  callback();
            });
      }],
      function(err){
          if (err){
              callback(err);
          } else {
              callback();
          }
      }
  );
  
};
//delete user role
module.exports.deleteUserRole = function(id, callback){
    OAuthUserRolesModel.remove({_id: id}, function(err){
        if (err)
            callback(err.message); 
        else
            callback();
    });
};

/*
 * Required to support refreshToken grant type
 */
module.exports.saveRefreshToken = function (token, clientId, expires, userId, callback) {
  // debug('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId +', userId: ' + userId + ', expires: ' + expires + ')');

  var refreshToken = new OAuthRefreshTokensModel({
    refreshToken: token,
    clientId: clientId,
    userId: userId,
    expires: expires
  });

  refreshToken.save(callback);
};

module.exports.getRefreshToken = function (refreshToken, callback) {
  // debug('in getRefreshToken (refreshToken: ' + refreshToken + ')');

  OAuthRefreshTokensModel.findOne({ refreshToken: refreshToken }, callback);
};

//find roles for a user
module.exports.getUserRoles = function (userId, clientId, callback) {
  OAuthUserRolesModel.find({ userId: userId, clientId: clientId }, callback);
};

//add user role
module.exports.addUserRole = function (userId, clientId, role, callback) {
  async.series([
      function(callback){
          var userRole = new OAuthUserRolesModel();
          userRole.userId = userId;
          userRole.clientId = clientId;
          userRole.role = role;
          userRole.save(function(err) {
              if (err)
                  callback(err);
              else
                  callback();
            });
      }],
      function(err){
          if (err){
              callback(err);
          } else {
              callback();
          }
      }
  );
  
};

