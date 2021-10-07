const express = require('express');
const router = express.Router();
const User = require('../verify-user-sdk/lib/index.js').User;

// load contents of .env into process.env
require('dotenv').config();

const appClientConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};

const adaptive_enabled = (process.env.ADAPTIVE_ENABLED == "true");

const mustBeAuthenticated = (req, res, next) => {
  if (!req.session.authenticated) {
    res.redirect('/login');
  } else {
    next();
  }
};

router.get('/register', mustBeAuthenticated, async (_req, res, _next) => {
      res.render('ecommerce-fido2-register');
});

router.get('/attestation/options', mustBeAuthenticated, async (req, res, _next) => {

  let rp = req.app.get('fidorp');
  let user = new User(appClientConfig,{accessToken: req.session.token.access_token});

  if (!rp) {
    let rps = await user.getFidoRelyingParties(process.env.FIDO2_ORIGIN);
    if (rps) {
      rp = rps[0];
      req.app.set('fidorp',rp);
    }
  }

  if (rp) {
    let fidoOptions = await user.getFidoRegistration(rp, null);
    if (fidoOptions) {
      res.json(fidoOptions);
      return;
    }
  }

  res.json({error: "Initialization failed"});

});

router.post('/attestation/result', mustBeAuthenticated, async (req, res, _next) => {

  let data = req.body;
  let rp = req.app.get('fidorp');

  if (data && rp) {
    data.enabled = true;
    let user = new User(appClientConfig,{accessToken: req.session.token.access_token});
    let result = await user.processFidoRegistration(rp,data);

    if (result) {
      res.json({success: true})
      return;
    }
  }
  res.json({success: false, message: "Registration failed"});

});

router.get('/assertion/options', async (req, res, _next) => {

  let adaptive = req.app.get('adaptiveClient');
  let rp = req.app.get('fidorp');

  if (!rp) {
    let rps = await adaptive.getFidoRelyingParties(req.session.transactionId, process.env.FIDO2_ORIGIN);
    if (rps) {
      rp = rps[0];
      req.app.set('fidorp',rp);
    }
  }

  if (rp) {

    var ip = req.ip;
    if (process.env.ADAPTIVE_OVERRIDE_IP) {
      ip = process.env.ADAPTIVE_OVERRIDE_IP;
    }

    var context = {
      sessionId: "", // Empty value because not using Adaptive Access
      userAgent: req.headers['user-agent'],
      ipAddress: ip
    }

    let user;
    if (req.session.factor) user = req.session.factor.userId;

    let response = await adaptive.generateFIDO(context,req.session.transactionId, rp.id, user);
    if (response) {
      res.json(response.fido);
      return;
    }
  }

  res.json({error: "Initialization failed"});

});

router.post('/assertion/result', async (req, res, _next) => {
  let adaptive = req.app.get('adaptiveClient');
  let result = undefined;

  if (adaptive_enabled && req.query.sess) {
    req.session.sessionId = req.query.sess;
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

  let data = req.body;
  let rp = req.app.get('fidorp');

  if (data && rp) {

    result = await adaptive.evaluateFIDO(context, req.session.transactionId, data)

    if (result) {
      req.session.loginresult = result;
      res.json({success: true})
      return;
    }
  }
  res.json({success: false, message: "Authentication failed"});

});

module.exports = router;
