const express = require('express');
const router = express.Router();
const createError = require('http-errors');

// load contents of .env into process.env
require('dotenv').config();

router.get('/', async (req, res, next) => {
  res.render('ecommerce-new-account');
});

router.post('/', async (req, res, next) => {

  console.log("***POST***: " + JSON.stringify(req.body));

  let errorMsg = undefined;
  let done = false;

  if (!req.body.firstname) errorMsg = "First name is required. ";
  if (!req.body.surname) errorMsg += "Last name is required. ";
  if (!req.body.email) errorMsg += "e-mail address is required. ";
  if (!(req.body.sendpw && req.body.sendpw == "on")) errorMsg += " Consent is required.";

  if (errorMsg) {
    res.render('ecommerce-new-account', {
      errorMsg: errorMsg
    });
    done = true;
  }

  let result = undefined;
  if (!done) {
    var verifyClient = req.app.get('verifyClient');

    let path = `${process.env.TENANT_URL}/v2.0/Users`;

    var userInfo = {
        "schemas": [
          "urn:ietf:params:scim:schemas:core:2.0:User",
          "urn:ietf:params:scim:schemas:extension:ibm:2.0:User"
        ],
        "userName": req.body.email,
        "title": "",
        "name": {
          "familyName": req.body.surname,
          "givenName": req.body.firstname,
          "middleName": ""
        },
        "displayName": req.body.firstname+" "+req.body.surname,
        "preferredLanguage": "en-US",
        "active": true,
        "emails": [
          {
            "value": req.body.email,
            "type": "work"
          }
        ],
        "urn:ietf:params:scim:schemas:extension:ibm:2.0:User": {
          "userCategory": "regular",
          "twoFactorAuthentication": false
        }
      }

    let options = {
      method: 'POST',
      accept: 'application/scim+json',
      contentType: 'application/scim+json',
      url: path,
      data: JSON.stringify(userInfo)
      };
    console.log(options);
    try {
      result = await verifyClient.makeRequest(options);
      if (!result || !result.id) {
        next(createError(500));
      }
    } catch(err) {
      next(createError(500));
      done = true;
    }
  }

  if (!done) {

    let path = `${process.env.TENANT_URL}/v2.0/factors/emailotp`;

    let body = {
      "emailAddress": req.body.email,
      "enabled": true,
      "userId": result.id
    }

    let options = {
      method: 'POST',
      accept: 'application/json',
      contentType: 'application/json',
      url: path,
      rawData: true,
      data: body
      };

    try {
      result = await verifyClient.makeRequest(options);
      console.log("***OTPREG***: " + JSON.stringify(result));
      if (result) {
        res.render('ecommerce-account-created');
        done = true;
      }
    } catch(err) {
      console.log(err);
      next(createError(500));
      done = true;
    }
  }

  if (!done) next(createError(500));

});


module.exports = router;
