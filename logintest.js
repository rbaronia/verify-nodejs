/*
 * Test application which exercises the PolicyAuth grant flow.
 */

// Require the included (bespoke) Native App SDK library
// This is an augmented version of the published Adaptive Proxy SDK
const Adaptive = require('./verify-nativeapp-sdk').Adaptive;

// Require readline package (to get user input)
const readline = require('readline');

// dotenv loads configuration from .env file
// From here we get TENANT_URL, APP_CLIENT_ID, APP_CLIENT_SECRET
const dotenv = require('dotenv');
dotenv.config();

// Initialize Adaptive class
const adaptiveConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};
const adaptive = new Adaptive(adaptiveConfig);

// Main class is asynchronous to allow await on Promises
async function main() {

  // Set hard-coded context
  // Would usually be set based on incoming HTTP request
  var context = {
    sessionId: "",
    userAgent: "myagent",
    ipAddress: "9.1.2.3"
  }

  // Initialize authentication flow and perform first contact assessment.
  // This calls the OAuth token endpoint with "policyauth" grant type
  // The SDK response includes a "status" (deny, require)
  // If require, a transactionId is returned which indexes the in-progress
  // authentication
  let firstContact = await adaptive.assessPolicy(context);

  console.log("*** Initial Assessment: " + JSON.stringify(firstContact, null, 2));

  if (firstContact.status != "deny") {

    // Assume password authentication permitted

    // Get Username and password from user
    let username = await getInput("Username: ");
    let password = await getInput("Password: ", true);

    if (username) {

      // Lookup identity sources (and get the first).
      // This function calls the /v1/mgmt/idaas/user/identitysources endpoint.
      // This call is NOT available in the published Adaptive SDK.
      var idSources = await adaptive.lookupIdentitySources(context,
        firstContact.transactionId,
        username);

      // Perform password validation
      let result;
      try {

        // Continue authentication flow with password authentication.
        // This calls the /v1.0/authmethods/password/<id_source id> endpoint.
        // The transaction ID is provided which indexes in-progress flow.
        // The SDK response includes a "status" (deny, require)
        // If require, a transactionId is returned which indexes the in-progress
        // authentication
        result = await adaptive.evaluatePassword(context,
          firstContact.transactionId,
          idSources[0].id,
          username, password);
      } catch (error) {
        // A 400 error is returned if validation fails.
        if (error.response.data) { // Log response message if available
          console.log(error.response.data);
        } else console.log(error); // Otherwise log entire error object.
      }

      console.log("*** After First Factor: " + JSON.stringify(result, null, 2));

    } else console.log("No Username provided. Aborting.");
  } else console.log("Access Denied (or app credentials bad). Aborting.")
}

// Function to get input from user
// Includes option to mute the echo for passwords
function getInput(question, muted = false) {
  return new Promise((resolve, reject) => {
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    if (muted) rl.stdoutMuted = true;

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted)
        rl.output.write("\x1B[2K\x1B[200D" + rl.query);
      else
        rl.output.write(stringToWrite);
    };
    rl.query = question;
    rl.question(rl.query, text => {
      rl.close();
      resolve(text);
    });
  });
}

main();
