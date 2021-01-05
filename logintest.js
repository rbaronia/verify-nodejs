// Test for Adaptive
const Adaptive = require('./verify-nativeapp-sdk').Adaptive;
//const OAuthClientCreds = require('./oauth-client-creds').OAuthClientCreds;
const readline = require('readline');

// dotenv loads configuration from .env file
const dotenv = require('dotenv');
dotenv.config();

// Initialize Adaptive class
const adaptiveConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};
const adaptive = new Adaptive(adaptiveConfig);

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

async function main() {
  let firstContact;

  // Set hard-coded context
  // Would usually be set based on incoming HTTP request
  var context = {
    sessionId: "",
    userAgent: "myagent",
    ipAddress: "9.1.2.3"
  }

  // Initialize and perform first contact assessment
  firstContact = await adaptive.assessPolicy(context);

  console.log("*** Initial Assessment: " + JSON.stringify(firstContact, null, 2));

  if (firstContact.status != "deny") {

    // Assume password authentication permitted

    // Get Username and password from user
    let username = await getInput("Username: ");
    let password = await getInput("Password: ", true);

    if (username) {

      // Lookup identity sources (and get the first)
      var idSources = await adaptive.lookupIdentitySources(context,
        firstContact.transactionId,
        username);

      // Perform password authentication and JWT exchange
      let result;
      try {
        result = await adaptive.evaluatePassword(context,
          firstContact.transactionId,
          idSources[0].id,
          username, password);
      } catch (error) {
        if (error.response.data) {
          console.log(error.response.data);
        } else console.log(error);
      }

      console.log("*** After First Factor: " + JSON.stringify(result, null, 2));

    } else console.log("No Username provided. Aborting.");
  } else console.log("Access Denied (or app credentials bad). Aborting.")
}

main();
