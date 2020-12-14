const express = require('express');
const router = express.Router();
const createError = require('http-errors');
const User = require('../verify-nativeapp-sdk/lib/index.js').User;

// load contents of .env into process.env
require('dotenv').config();

const userClientConfig = {
  tenantUrl: process.env.TENANT_URL
}

const mustBeAuthenticated = (req, res, next) => {
  if (!req.session.authenticated) {
    res.redirect('login');
  } else {
    next();
  }
};

router.get('/', mustBeAuthenticated, async (req, res, _next) => {
  let scim;
  if (!req.session.user) {
    let user = new User(userClientConfig,req.session.token.access_token);
    scim = await user.getUser();
    req.session.user = scim;
  } else {
    scim = req.session.user;
  }

  res.render('ecommerce-account', scim);
});

router.post('/', mustBeAuthenticated, async (req, res, _next) => {
  let user = new User(userClientConfig,req.session.token.access_token);
  let currentUser = req.session.user;

  currentUser.name.givenName = req.body.firstname;
  currentUser.name.familyName = req.body.surname;
  currentUser.emails[0] = {type: "work", value: req.body.email};
  currentUser.phoneNumbers[0] = {type: "mobile", value: req.body.mobile};
  currentUser.addresses[0] = {type: "work",
    streetAddress: req.body.street,
    locality: req.body.city,
    region: req.body.region,
    country: req.body.country
  };

  let result = await user.updateUser(currentUser);
  req.session.user = result;

  res.render('ecommerce-account', result);
});

module.exports = router;
