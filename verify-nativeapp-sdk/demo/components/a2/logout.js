const adaptive = require('./adaptive');

const express = require('express');


const router = express.Router();

router.post('/logout', (req, res) => {
  // Extract parameters from request.
  const transactionId = req.body.transactionId;

  // Logout (i.e. revoke the access token).
  adaptive.logout(transactionId)
      .then(() =>{
        res.send();
      }).catch((error) => {
        console.log(error);
        res.status(404).send({error: error.message});
      });
});

module.exports = router;
