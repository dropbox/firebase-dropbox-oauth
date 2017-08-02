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
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ****************************************************************************
 *
 * This work is derived from
 * https://github.com/firebase/custom-auth-samples/blob/master/instagram/app.js,
 * Copyright 2016 Google Inc, which was released under the terms of the License
 * above.
 *
 * This file has been modified in the following ways:
 * 1. The code has been rewritten to use Dropbox as an authentication provider,
 * not Instagram.
 * 2. Rather than displaying a list of photos, currently this page only displays
 * that the user is logged in.
 **/
'use strict';

let $ = require('jquery');

// Initializes the Demo.
function Demo() {
  this.signInButton = document.getElementById('demo-sign-in-button');
  this.signOutButton = document.getElementById('demo-sign-out-button');
  this.nameContainer = document.getElementById('demo-name-container');
  this.uidContainer = document.getElementById('demo-uid-container');
  this.deleteButton = document.getElementById('demo-delete-button');
  this.profilePic = document.getElementById('demo-profile-pic');
  this.signedOutCard = document.getElementById('demo-signed-out-card');
  this.signedInCard = document.getElementById('demo-signed-in-card');
  this.filesContainer = document.getElementById('demo-files-container');

  // Bind events.
  this.signInButton.addEventListener('click', this.onSignInButtonClick.bind(this));
  this.signOutButton.addEventListener('click', this.onSignOutButtonClick.bind(this));
  this.deleteButton.addEventListener('click', this.onDeleteAccountButtonClick.bind(this));
  firebase.auth().onAuthStateChanged(this.onAuthStateChanged.bind(this));
  // Shortcuts to DOM Elements.
  console.info(this);
}

// Triggered on Firebase auth state change.
Demo.prototype.onAuthStateChanged = function(user) {
  // Skip token refresh.
  if(user && user.uid === this.lastUid) return;

  this.filesContainer.innerHTML = '';
  if (user) {
    this.lastUid = user.uid;
    this.nameContainer.innerText = user.displayName;
    this.uidContainer.innerText = user.uid;
    this.profilePic.src = user.photoURL;
    this.signedOutCard.style.display = 'none';
    this.signedInCard.style.display = 'block';
    this.dropboxTokenRef = firebase.database().ref('/users/' + user.uid);
    this.showDropboxFiles();
  } else {
    this.lastUid = null;
    this.filesContainer.innerHTML = '';
    this.signedOutCard.style.display = 'block';
    this.signedInCard.style.display = 'none';
  }
};

// Initiates the sign-in flow using LinkedIn sign in in a popup.
Demo.prototype.showDropboxFiles = function() {
  // The Dropbox Access Token is saved in the Realtime Database. We fetch it first.
  this.dropboxTokenRef.once('value').then(snapshot => {
    let userData = snapshot.val();
    console.info(userData);
  }, e => console.error('no way', this.dropboxTokenRef.key, e));
};

function getFirebaseProjectId() {
  return firebase.app().options.projectId;
}

function apiUrl(suffix) {
  let stem;

  let curBase = window.location.href;
  if (curBase.startsWith('http://localhost:')) {
    // the local firebase function server will typically run one port above the hosting server. I hope.
    let pieces = curBase.split(":");
    let port = parseInt(pieces[2]) + 1;
    stem = `http://${pieces[1]}:${port}/${getFirebaseProjectId()}/us-central1/api`;
  } else {
    stem = `https://us-central1-${getFirebaseProjectId()}.cloudfunctions.net/api`;
  }
  return `${stem}/${suffix}`;
}

// Initiates the sign-in flow using LinkedIn sign in in a popup.
Demo.prototype.onSignInButtonClick = function() {
  // Open the Auth flow as a popup.
  window.location.href = apiUrl('redirect');
};

// Signs-out of Firebase.
Demo.prototype.onSignOutButtonClick = function() {
  firebase.auth().signOut();
};

// Deletes the user's account.
Demo.prototype.onDeleteAccountButtonClick = function() {
  this.dropboxTokenRef.remove().then(function() {
    firebase.auth().currentUser.delete().then(function () {
      window.alert('Account deleted');
    }).catch(function (error) {
      if (error.code === 'auth/requires-recent-login') {
        window.alert('You need to have recently signed-in to delete your account. Please sign-in and try again.');
        firebase.auth().signOut();
      }
    });
  });
};

// Load the demo.
$(document).ready(() => {
  let token = (new URL(document.location)).searchParams.get("token");
  console.info('token', token);
  if(token) {
    firebase.auth().signInWithCustomToken(token).then(() => {
      window.history.replaceState({}, '', '/');
      new Demo();
    });
  }
  else new Demo();
});