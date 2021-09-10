const express = require('express');
const router = express.Router();
const Adaptive = require('adaptive-proxy-sdk');
const User = require('../verify-user-sdk/lib/index.js').User;
const createError = require('http-errors');

// load contents of .env into process.env
require('dotenv').config();

const appClientConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};

const mmfaProfile = process.env.AUTHENTICATOR_PROFILEID
const adaptive_enabled = (process.env.ADAPTIVE_ENABLED == "true");

const adaptive = new Adaptive(appClientConfig);
const date = new Date();

router.get('/', async (req, res, next) => {

  var done = false;
  var result = undefined;

  var ip = req.ip;
  if (process.env.ADAPTIVE_OVERRIDE_IP) {
    ip = process.env.ADAPTIVE_OVERRIDE_IP;
  }

  var context = {
    sessionId: "", // Empty value because not using Adaptive Access
    userAgent: req.headers['user-agent'],
    ipAddress: ip
  }

  try {
    result = await adaptive.assessPolicy(context);
  } catch (e) {
    next(createError(500));
    done = true;
  }

  if (!done && (!result || result.status == "deny")) {
    next(createError(403));
    done = true;
  }

  if (!done && result.status == "requires") {

    req.session.transactionId = result.transactionId;

    var factors = {};
    var factorsArray = result.allowedFactors;
    factorsArray.forEach((item, i) => {
      factors[item.type] = {
        enabled: true
      };
    });

    if (factors.qr) {
      try {
        var qrlogin = await adaptive.generateQR(context, req.session.transactionId, mmfaProfile);
        factors.qr.code = qrlogin.qr.code;
      } catch (e) {
        next(createError(500));
        done = true;
      }
    }

    res.render('ecommerce-login', {
      factors: factors,
      adaptive: adaptive_enabled
    });
  }
});

router.post('/newpwd', async (req, res, next) => {

  let done = false;

  if (req.body.newpwd1 != req.body.newpwd2) {
    res.render('ecommerce-new-password');
    done = true;
  }

  if (!done) {
    result = undefined;
    let pwd = req.session.pwd;
    delete req.session.pwd;
    try {
      let user = new User(appClientConfig, req.session.scimToken);
      result = await user.updateUserPassword(pwd, req.body.newpwd1);
      delete req.session.scimToken;
      next()
    } catch (error) {
      console.log(error);
      next(createError(400))
      done = true;
    }
  }
}, checkMfa);


router.post('/', async (req, res, next) => {

  let done = false;

  if (adaptive_enabled && req.body.sessionId) {
    req.session.sessionId = req.body.sessionId;
  } else {
    req.session.sessionId = "";
  }

  var ip = req.ip;
  if (process.env.ADAPTIVE_OVERRIDE_IP) {
    ip = process.env.ADAPTIVE_OVERRIDE_IP;
  }

  var context = {
    sessionId: req.session.sessionId,
    userAgent: req.headers['user-agent'],
    ipAddress: ip
  }

  let idSource;

  try {
    // Lookup "Cloud Directory" identity source
    let idSources = await adaptive.lookupIdentitySources(context,
      req.session.transactionId,
      "Cloud Directory");
    idSource = idSources[0].id;
  } catch (error) {
    console.log(error);
    next(createError(500))
    done = true;
  }

  if (!done) {
    result = undefined;
    try {
      result = await adaptive.evaluatePassword(context,
        req.session.transactionId, idSource,
        req.body.j_username, req.body.j_password);

      if (result && result.status == "allow") {
        req.session.authenticated = true;
        req.session.token = result.token;

        // Add absolute expiry time to the token data
        // Calculated from current time and expires_in
        req.session.token.expirytime = date.getTime() + (result.token.expires_in * 1000);
      }

      if (result && result.status == "deny") {
        console.log("***DENIED***" + JSON.stringify(result));
        next(createError(403));
        done = true;
      }

    } catch (error) {
      next(createError(403));
      done = true;
    }
  }

  if (!done) {
    req.session.passresult = result;
    if (req.session.token) {
      req.session.scimToken = req.session.token.access_token;
    } else {
      req.session.scimToken = adaptive.getToken(req.session.transactionId);
    }
    let scim;
    if (!req.session.user) {
      let user = new User(appClientConfig, req.session.scimToken);
      scim = await user.getUser();
      req.session.user = scim;
    } else {
      scim = req.session.user;
    }
    if (scim["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"].pwdReset) {
      req.session.pwd = req.body.j_password;
      res.render('ecommerce-new-password');
      done = true;
    } else {
      delete req.session.scimToken;
    }
  }

  if (!done) next();
}, checkMfa);

// Handle GET request for /userlogin/qrcheck
// This endpoint is intended to be accessed by client-side JavaScript
// on the login page which polls to see if QRLogin has been completed
router.get('/qrcheck', async function(req, res, _next) {

  // Call QRLogin validation function.
  // Pass in the response from initation which includes transaction id
  // and DSI needed for the validation check.

  let result = undefined;

  if (adaptive_enabled && req.body.sessionId) {
    req.session.sessionId = req.body.sessionId;
  } else {
    req.session.sessionId = "";
  }

  var ip = req.ip;
  if (process.env.ADAPTIVE_OVERRIDE_IP) {
    ip = process.env.ADAPTIVE_OVERRIDE_IP;
  }

  var context = {
    sessionId: req.session.sessionId,
    userAgent: req.headers['user-agent'],
    ipAddress: ip
  }

  try {
    result = await adaptive.evaluateQR(context, req.session.transactionId);
    if (result && result.status != "pending") {
      req.session.qrresult = result;
      res.json({
        "state": "DONE",
        "next": "/login/qrlogin"
      });
    } else {
      res.json({
        "state": "PENDING"
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      "state": "ERROR"
    });
  }
});

router.get('/qrlogin', async (req, res, next) => {

  if (!req.session.qrresult) {
    next(createError(400));
  } else {

    var result = req.session.qrresult;
    delete req.session.qrresult;

    if (result && result.status == "allow") {
      req.session.authenticated = true;
      req.session.token = result.token;

      // Add absolute expiry time to the token data
      // Calculated from current time and expires_in
      req.session.token.expirytime = date.getTime() + (result.token.expires_in * 1000);
    }

    req.session.passresult = result;
    next();
  }

}, checkMfa);

function checkMfa(req, res, next) {

  let done = false;

  if (req.session.passresult && req.session.passresult.status == "allow") {
    delete req.session.passresult;
    res.redirect('/home');
    done = true;
  }

  if (!done && req.session.passresult && req.session.passresult.status == "requires") {
    res.redirect('/mfa');
    done = true;
  }

  if (!done) next(createError(403));
}

module.exports = router;
