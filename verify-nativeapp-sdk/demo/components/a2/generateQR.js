const adaptive = require('./adaptive');

const express = require('express');


const router = express.Router();

router.post('/generations/qr', (req, res) => {
  const sessionId = req.body.sessionId;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;
  const context = {sessionId, userAgent, ipAddress};

  // Extract parameters from request.
  const transactionId = req.body.transactionId;
  const profileId = req.body.profileId;
  const userId = req.body.userId;

  // Request a QR login verification.
  adaptive.generateQR(context, transactionId, profileId, userId)
      .then((result) => {
        res.send(result);
      }).catch((error) => {
        console.log(error);
        res.status(404).send({error: error.message});
      });
});

module.exports = router;
