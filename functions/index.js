
/**
 * Copyright 2017 Dropbox Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for t`he specific language governing permissions and
 * limitations under the License.
 *
 * ****************************************************************************
 *
 * This work is derived from
 * https://github.com/firebase/custom-auth-samples/blob/master/instagram/app.js,
 * Copyright 2016 Google Inc, which was released under the terms of the License
 * above.
 *
 * This file has been modified in the following ways:
 * 1. The code has been rewritten to use Dropbox's Oauth API, not Instagram.
 * 2. The mobile endpoints provided in the original have been removed.
 * 3. The database structure has been altered.
 * 4. The server has been written to be hosted as a Firebase Cloud Function.
 **/
'use strict';

// Modules imports
const functions = require('firebase-functions');
const express = require('express');
const cookieSession = require('firebase-cookie-session');
const crypto = require('crypto');

// Load config file
const {config, cookieKeys} = require('./oauth-conf.js');
// Firebase Setup
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-conf.js').config;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

function apiUrl(req, suffix) {
  let stem;

  if (req.get('host').startsWith('localhost:')) {
    stem = `${req.protocol}://${req.get('host')}/${serviceAccount.project_id}/us-central1/api`;
  } else {
    stem = `https://us-central1-${serviceAccount.project_id}.cloudfunctions.net/api`;
  }
  return `${stem}${suffix}`;
}

// Dropbox OAuth 2 setup
const credentials = {
  client: {
    id: config.appKey,
    secret: config.appSecret
  },
  auth: {
    tokenHost: 'https://api.dropbox.com',
    tokenPath: '1/oauth2/token',
    authorizeHost: 'https://www.dropbox.com',
    authorizePath: '1/oauth2/authorize'
  }, options: {useBodyAuth: false}

};
const oauth2 = require('simple-oauth2').create(credentials);

// Path to the OAuth handlers.
const OAUTH_REDIRECT_PATH = '/redirect';
const OAUTH_CALLBACK_PATH = '/dropbox-callback';

// ExpressJS setup
const app = express();
app.enable('trust proxy');
app.use(cookieSession({
  keys: cookieKeys,
  maxAge: 3600000
}));

function callbackUri(req) {
  return apiUrl(req, OAUTH_CALLBACK_PATH);
}

/**
 * Redirects the User to the Dropbox authentication consent screen. Also the 'state' cookie is set for later state
 * verification.
 */
app.get(OAUTH_REDIRECT_PATH, (req, res) => {
  const state = req.session.state || crypto.randomBytes(20).toString('hex');
  req.session.state = state;
  req.session.source = req.get('referer');
  const redirectUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: callbackUri(req),
    state: state
  });
  res.redirect(redirectUri);
});

/**
 * Exchanges a given Dropbox auth code passed in the 'code' URL query parameter for a Firebase auth token.
 * The request also needs to specify a 'state' query parameter which will be checked against the 'state' cookie to avoid
 * Session Fixation attacks.
 * This is meant to be used by Web Clients.
 */
app.get(OAUTH_CALLBACK_PATH, (req, res) => {
  console.log('Received state cookie:', req.session);
  console.log('Received state query parameter:', req.query.state);
  if (!req.session.state) {
    res.status(400).send('State cookie not set or expired. Maybe you took too long to authorize. Please try again.');
  } else if (req.session.state !== req.query.state) {
    res.status(400).send('State validation failed');
  }
  else {
    oauth2.authorizationCode.getToken({
      code: req.query.code,
      redirect_uri: callbackUri(req)
    }).then(results => {
      // We have a Dropbox access token and the user identity now.
      const accessToken = results.access_token;
      const dropboxUserID = results.account_id;

      // Create a Firebase account and get the Custom Auth Token.
      createFirebaseAccount(dropboxUserID, accessToken).then(firebaseToken => {
        // Redirect to a frontend url that will log the user in
        res.redirect(`${req.session.source}login?token=${firebaseToken}`)
      });
    }, error => {
      console.error(error);
      res.send(error.context)
    });
  }
});

/**
 * Creates a Firebase account with the given user profile and returns a custom auth token allowing
 * signing-in this account.
 * Also saves the accessToken to the datastore at /dropboxAccessToken/$uid
 *
 * @returns {Promise<string>} The Firebase custom auth token in a promise.
 */
function createFirebaseAccount(dropboxID, accessToken) {
  // The UID we'll assign to the user.
  const uid = `dropbox:${dropboxID}`;

  // Save the access token tot he Firebase Realtime Database.
  const databaseTask = admin.database().ref(`users/${uid}/dropboxAccessToken`).set(accessToken);

  // Create or update the user account.
  const userCreationTask = admin.auth().updateUser(uid, {
  }).catch(error => {
    // If user does not exists we create it.
    if (error.code === 'auth/user-not-found') {
      return admin.auth().createUser({
        uid: uid,
      });
    }
    throw error;
  });

  // Wait for all async task to complete then generate and return a custom auth token.
  return Promise.all([userCreationTask, databaseTask]).then(() => {
    // Create a Firebase custom auth token.
    return admin.auth().createCustomToken(uid);
  });
}

/**
 * Generates the HTML template that signs the user in Firebase using the given token and closes the
 * popup.
 */
function signInFirebaseTemplate(token) {
  return `
    <script src="https://www.gstatic.com/firebasejs/4.2.0/firebase.js"></script>
    <script>
      let token = '${token}';
      console.info(token)
      let config = {
        apiKey: "AIzaSyCzByhQJw3NYfXQ9hRjUhj__tdreL5NUFE",
        authDomain: "firedroplet-5708f.firebaseapp.com",
        databaseURL: "https://firedroplet-5708f.firebaseio.com",
        projectId: "firedroplet-5708f",
        storageBucket: "firedroplet-5708f.appspot.com",
        messagingSenderId: "347895779712"
      };
      let app = firebase.initializeApp(config);
      app.auth().signInWithCustomToken(token).then(function(d) {
        console.info(d)
//        window.close();
      });
    </script>`;
}

exports.api = functions.https.onRequest(app);