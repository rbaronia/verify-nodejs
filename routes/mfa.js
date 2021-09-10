const express = require('express');
const router = express.Router();
const Adaptive = require('adaptive-proxy-sdk');
const createError = require('http-errors');

// load contents of .env into process.env
require('dotenv').config();

const appClientConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};

const adaptive = new Adaptive(appClientConfig);
const date = new Date();

function getOtpLabel(item) {
  if (item.type == "totp") return "Time-based OTP";
  if (item.type == "emailotp") return "E-mail OTP";
  if (item.type == "smsotp") return "SMS OTP";
  if (item.type == "voiceotp") return "Voice OTP";
  //if (item.type == "signature") return "Mobile push";
}

router.get('/', (req, res, next) => {

  var done = false;
  var result = req.session.passresult;

  if (!result) {
    done = true;
    next(createError(403));
  }

  if (!done && result.enrolledFactors) {

    console.log("***MFA***: " + JSON.stringify(result));

    var push = null;
    var factors = [];
    var factorLookup = {};
    var factorsArray = result.enrolledFactors;
    factorsArray.forEach((item, _i) => {
      let label = getOtpLabel(item);
      if (item.enabled && label) {

        if (item.subType) {
          if (item.subType != "userPresence" || push == null)
            push = item;
        }

        if (item.subType != "userPresence") {
          factors.push({
            type: item.type,
            id: item.id,
            label: label
          });
          factorLookup[item.id] = item;
        }
      }
    });
    if (push && push.subType == "userPresence") {
      factors.push({
        type: push.type,
        id: push.id,
        label: getOtpLabel(push)
      });
      factorLookup[push.id] = push;
    }

    req.session.factorLookup = factorLookup;

    if (factors.length == 1) {
      req.body.factorid = factors[0].id;
      next();
    } else {
      res.render('ecommerce-choosemfa', {
        factors: factors
      });
    }
    done = true;
  }

  if (!done) next(createError(403));

}, challengeMfa);

router.post('/', challengeMfa);

async function challengeMfa(req, res, next) {
  var done = false;
  var factorLookup = req.session.factorLookup;

  var ip = req.ip;
  if (process.env.ADAPTIVE_OVERRIDE_IP) {
    ip = process.env.ADAPTIVE_OVERRIDE_IP;
  }

  var context = {
    sessionId: req.session.sessionId,
    userAgent: req.headers['user-agent'],
    ipAddress: ip
  }

  if (!factorLookup) {
    done = true;
    next(createError(403));
  }

  if (!done) {
    if (factorLookup[req.body.factorid].type == "totp") {
      req.session.factor = factorLookup[req.body.factorid];
      var message = "Please enter your TOTP code.";
      res.render('ecommerce-otp-challenge', {
        message: message
      });
      done = true;
    }

    if (factorLookup[req.body.factorid].type == "emailotp") {
      req.session.factor = factorLookup[req.body.factorid];

      var otp = await adaptive.generateEmailOTP(context,
        req.session.transactionId, req.session.factor.id);

      var message = "Please enter OTP code sent to your e-mail address.";
      res.render('ecommerce-otp-challenge', {
        message: message,
        correlation: otp.correlation
      });
      done = true;
    }

    if (factorLookup[req.body.factorid].type == "smsotp") {
      req.session.factor = factorLookup[req.body.factorid];

      var otp = await adaptive.generateSMSOTP(context,
        req.session.transactionId, req.session.factor.id);

      var message = "Please enter OTP code sent to your phone.";
      res.render('ecommerce-otp-challenge', {
        message: message,
        correlation: otp.correlation
      });
      done = true;
    }

    if (factorLookup[req.body.factorid].type == "voiceotp") {
      req.session.factor = factorLookup[req.body.factorid];

      var otp = await adaptive.generateVoiceOTP(context,
        req.session.transactionId, req.session.factor.id);

      var message = "Please enter OTP code received via phone.";
      res.render('ecommerce-otp-challenge', {
        message: message,
        //correlation: otp.correlation (not used by voice)
      });
      done = true;
    }

    if (factorLookup[req.body.factorid].type == "signature") {
      req.session.factor = factorLookup[req.body.factorid];

      var push = await adaptive.generatePush(
                  context,
                  req.session.transactionId,
                  req.session.factor.id,
                  req.session.factor.references.authenticatorId,
                  "Please validate your login to TrustMe Store",
                  "TrustMe Store",
                  "Login validation required",
                  []);
      res.render('ecommerce-push-challenge', {
        code: push.correlation
      });
      done = true;
    }
  }

  if (!done) next(createError(403));
}

router.post('/otp', async (req, res, next) => {

  var done = false;
  var factor = req.session.factor;

  if (!factor || !req.body.otp) {
    done = true;
    next(createError(403));
  }

  if (!done) {

    var ip = req.ip;
    if (process.env.ADAPTIVE_OVERRIDE_IP) {
      ip = process.env.ADAPTIVE_OVERRIDE_IP;
    }

    var context = {
      sessionId: req.session.sessionId,
      userAgent: req.headers['user-agent'],
      ipAddress: ip
    }

    var otpresult = undefined;
    try {

      if (factor.type == "totp") {
        var otpresult = await adaptive.evaluateTOTP(context,
          req.session.transactionId, req.session.factor.id, req.body.otp);
      }

      if (factor.type == "emailotp") {
        var otpresult = await adaptive.evaluateEmailOTP(context,
          req.session.transactionId, req.body.otp);
      }

      if (factor.type == "smsotp") {
        var otpresult = await adaptive.evaluateSMSOTP(context,
          req.session.transactionId, req.body.otp);
      }

      if (factor.type == "voiceotp") {
        var otpresult = await adaptive.evaluateVoiceOTP(context,
          req.session.transactionId, req.body.otp);
      }

    } catch (error) {
      console.log("***ERROR***: " + JSON.stringify(error));
      next(createError(403))
      done = true;
    }
  }

  if (!done && otpresult && otpresult.status == "allow") {
    req.session.authenticated = true;
    req.session.token = otpresult.token;
    delete req.session.factor;
    delete req.session.factorLookup;
    delete req.session.passresult;
    delete req.session.transactionId;
    // Add absolute expiry time to the token data
    // Calculated from current time and expires_in
    req.session.token.expirytime = date.getTime() + (otpresult.token.expires_in * 1000);

    res.redirect('/home');
    done = true;
  }

  if (!done) next(createError(403));
});

// Handle GET request for /userlogin/pushcheck
// This endpoint is intended to be accessed by client-side JavaScript
// on the page which polls to see if Moble PUSH auth has been completed
router.get('/pushcheck', async function(req, res, _next) {

  // Call Moble PUSH validation function.
  // Pass in the transaction id

  let result = undefined;

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

    result = await adaptive.evaluatePush(context, req.session.transactionId);
    if (result && result.status != "pending") {
      req.session.pushresult = result;
      res.json({
        "state": "DONE",
        "next": "/mfa/pushdone"
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

router.get('/pushdone', async (req, res, next) => {

  if (!req.session.pushresult) {
    next(createError(400));
  } else {

    var result = req.session.pushresult;
    delete req.session.pushresult;

    if (result && result.status == "allow") {
      req.session.authenticated = true;
      req.session.token = result.token;
      delete req.session.factor;
      delete req.session.factorLookup;
      delete req.session.passresult;
      delete req.session.transactionId;

      // Add absolute expiry time to the token data
      // Calculated from current time and expires_in
      req.session.token.expirytime = date.getTime() + (result.token.expires_in * 1000);
      res.redirect('/home');
    } else {
      console.log("**NOT ALLOW**:" + JSON.stringify(result))
      next(createError(403));
    }
  }
});

module.exports = router;
