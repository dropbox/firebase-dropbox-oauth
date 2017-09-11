# Introduction

This project demonstrates how to use Dropbox OAuth as an authentication provider for a
Firebase application, with token generation handled by a Firebase cloud function wrapping
an Express server. 

This project is based on Google's 
[Instagram/Firebase authentication example](https://github.com/firebase/custom-auth-samples) 
(copyright Google Inc. 2016). You can read the Firebase team's blog post explaining custom 
authentication integrations 
[here](https://firebase.googleblog.com/2016/10/authenticate-your-firebase-users-with.html).

**This is example code only, and has not undergone a security audit. Use at your own risk.**

# Configuration and Setup

Before getting started, you will need to register a Firebase application through the 
[Firebase console](https://console.firebase.google.com/), and a Dropbox application 
through the [Dropbox developer's console](https://www.dropbox.com/developers/apps).

## Firebase Console
Go to the "Project Settings" tab for your Firebase project. Under the "General" tab, click 
"Add Firebase to your web app", and copy the script tags there to the appropriate section of
static/index.html. You will also need to fill in `functions/firebase-conf.js` with a 
private key for the Firebase Admin SDK, which you can generate under the "Service Accounts"
tab.

```
exports.config = {
  "type": ...
  "project_id": ...
  "private_key_id": ...
  "private_key": ...
  "client_email": ...
  "client_id": ...
  "auth_uri": ...
  "token_uri": ...
  "auth_provider_x509_cert_url": ...
  "client_x509_cert_url": ...
};
```

Finally, Google Cloud functions are not able to make calls to external APIs on the free version of Firebase.
To deploy your app to production, you'll need to upgrade it to a paid tier. Note that the "Blaze" pay-as-you-go
tier is likely to be considerably cheaper during development than the "Flame" 25$/month fixed tier.

## Dropbox Settings Page
You'll need to copy the following information from your Dropbox app's settings page to 
`functions/oauth-conf.js`:

```
exports.config = {
    appKey: <Your app key> 
    appSecret: <Your app secret> 
    accessToken: <Your accessToken> 
}
```
You'll also need to add the keys used to sign your cookies to this file. :

```
exports.cookieKeys = [
  'your signing key here',
  'old keys here (for key rotation)'
]
``` 

Add the following Redirect URIs in the OAuth2 section of your app's Settings page:
* http://localhost:5000/api/dropbox-callback (or whatever port you decide to use for local testing)
* https://<your-hosted-app-url>/api/dropbox-callback

Finally, for this example you should disallow implicit grant.

**NOTE: Keep your firebase-conf.js and oauth-conf.js files private! Never place them in source control.**

## Installation
You will need to run `npm install` from both your project's root directory, and from its `functions` 
subdirectory. The root NPM packages are used for running your local test environment and for client-side
imports, while `functions/package.json` is responsible for your authentication server's packages.

# Development

## Testing Locally
`npm run watch-js & firebase serve --only hosting,functions` will set up a local firebase server that 
you can use for development. By default the hosting should run on port 5000, and the functions on port 5001.

## Deployment
`npm run build-js && firebase deploy`

# TODO

* Firebase user IDs should be auto-generated UUIDs, with the firebase user profile containing the Dropbox ID.
* Correctly display user profile image
* Integrate File Saver/Chooser
