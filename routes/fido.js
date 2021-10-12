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

router.get('/attestation/options', mustBeAuthenticated, async (_req, res, _next) => {

  let rpUuid = process.env.FIDO2_RP_UUID;

  if (rpUuid) {
    let fidoOptions = await user.getFidoRegistration(rpUuid, null);
    if (fidoOptions) {
      res.json(fidoOptions);
      return;
    }
  }

  res.json({error: "Initialization failed"});

});

router.post('/attestation/result', mustBeAuthenticated, async (req, res, _next) => {

  let data = req.body;
  let rpUuid = process.env.FIDO2_RP_UUID;

  if (data && rpUuid) {
    data.enabled = true;
    let user = new User(appClientConfig,{accessToken: req.session.token.access_token});
    let result = await user.processFidoRegistration(rpUuid,data);

    if (result) {
      res.json({success: true})
      return;
    }
  }
  res.json({success: false, message: "Registration failed"});

});

router.get('/assertion/options', async (req, res, _next) => {

  let adaptive = req.app.get('adaptiveClient');
  let rpUuid = process.env.FIDO2_RP_UUID;

  if (rpUuid) {

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

    let response = await adaptive.generateFIDO(context,req.session.transactionId, rpUuid, user);
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
  let rpUuid = process.env.FIDO2_RP_UUID;

  if (data && rpUuid) {
    let authenticatorData = data.response.authenticatorData;
    let userHandle = data.response.userHandle
    let signature = data.response.signature
    let clientDataJSON = data.response.clientDataJSON;
    let credentialId = data.id;
    result = await adaptive.evaluateFIDO(context,
                req.session.transactionId,
                rpUuid,
                authenticatorData,
                userHandle,
                signature,
                clientDataJSON,
                credentialId)

    if (result) {
      req.session.loginresult = result;
      res.json({success: true})
      return;
    }
  }
  res.json({success: false, message: "Authentication failed"});

});

module.exports = router;
