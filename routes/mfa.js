const express = require('express');
const router = express.Router();
const Adaptive = require('./verify-nativeapp-sdk/lib/index.js').Adaptive;
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

    var factors = [];
    var factorLookup = {};
    var factorsArray = result.enrolledFactors;
    factorsArray.forEach((item, i) => {
      if (item.enabled) {
        factors.push({
          type: item.type,
          id: item.id,
          label: getOtpLabel(item)
        });
        factorLookup[item.id] = item;
      }
    });
    console.log("***Factors***: " + JSON.stringify(factors));

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

  var context = {
    sessionId: "", // Empty value because not using Adaptive Access
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
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

    var context = {
      sessionId: "", // Empty value because not using Adaptive Access
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
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

      console.log("***OTPRESULT***: " + JSON.stringify(otpresult));
    } catch (error) {
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

    console.log("**SESSION**: " + JSON.stringify(req.session));
    res.redirect('/home');
    done = true;
  }

  if (!done) next(createError(403));
});

module.exports = router;
