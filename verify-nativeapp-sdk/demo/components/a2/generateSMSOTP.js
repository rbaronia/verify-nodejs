const adaptive = require('./adaptive');

const express = require('express');


const router = express.Router();

router.post('/generations/smsotp', (req, res) => {
  const sessionId = req.body.sessionId;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;
  const context = {sessionId, userAgent, ipAddress};

  // Extract parameters from request.
  const transactionId = req.body.transactionId;
  const enrolmentId = req.body.enrolmentId;

  // Request an SMS OTP verification.
  adaptive.generateSMSOTP(context, transactionId, enrolmentId)
      .then((result) =>{
        res.send(result);
      }).catch((error) => {
        console.log(error);
        res.status(404).send({error: error.message});
      });
});

module.exports = router;
