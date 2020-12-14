// Import the Adaptive SDK.
const Adaptive = require('verify-nativeapp-sdk');

// Load contents of `.env` into `process.env`.
require('dotenv').config();

const config = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
};

module.exports = new Adaptive(config);
