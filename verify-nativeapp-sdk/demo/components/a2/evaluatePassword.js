const adaptive = require('./adaptive');

const express = require('express');


const router = express.Router();

router.post('/evaluations/password', (req, res) => {
  const sessionId = req.body.sessionId;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;
  const context = {sessionId, userAgent, ipAddress};

  // Extract parameters from request.
  const transactionId = req.body.transactionId;
  const username = req.body.username;
  const password = req.body.password;

  // Verify a password factor.
  adaptive.evaluatePassword(context, transactionId,
      process.env.IDENTITY_SOURCE_ID, username, password)
      .then((result) => {
        res.send(result);
      }).catch((error) => {
        console.log(error);
        res.status(404).send({error: error.message});
      });
});

module.exports = router;
