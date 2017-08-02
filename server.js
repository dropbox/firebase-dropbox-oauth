let express = require('express');
let passport = require('passport');
let DropboxOAuth2Strategy = require('passport-dropbox-oauth2');
let app = express();
let path = require('path');
let authConf = require('oauth-conf.js').config;

passport.use(new DropboxOAuth2Strategy({
    apiVersion: '2',
    clientID: authConf.appId,
    clientSecret: authConf.appSecret,
    callbackURL: authConf.callbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ providerId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


// Make files in /static accessible
app.use('/static', express.static(__dirname + '/static'));
// Make bower_components accessible
app.use('/node_modules',  express.static(__dirname + '/node_modules'));

// viewed at http://localhost:5000
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.set('port', (process.env.PORT || 8081));

app.get('/auth/dropbox',
  passport.authenticate('dropbox-oauth2'));

app.get('/auth/dropbox/callback',
  passport.authenticate('dropbox-oauth2', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
