// Load required packages
var mongoose = require('mongoose');

// Define our beer schema
var UserSchema   = new mongoose.Schema({
    appId: String,
    appSecret: String,
    isUser: Boolean,
    mobile: String,
    email: String
});

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);