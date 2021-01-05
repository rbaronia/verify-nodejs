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
function getInput(question, muted=false) {
  return new Promise((resolve, reject) => {
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
		if (muted) rl.stdoutMuted = true;

		rl._writeToOutput = function _writeToOutput(stringToWrite) {
		  if (rl.stdoutMuted)
		    rl.output.write("\x1B[2K\x1B[200D"+rl.query);
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
  let result;

  // Set hard-coded context
  // Would usually be set based on incoming HTTP request
  var context = {
    sessionId: "",
    userAgent: "myagent",
    ipAddress: "9.1.2.3"
  }

  // Initialize and perform first contact assessment
  result = await adaptive.assessPolicy(context);
  console.log("Initial Assessment: " + JSON.stringify(result));

  // Assume password authentication permitted

  // Get Username and password from user
  let username = await getInput("Username: ");
  let password = await getInput("Password: ",true);

  if (username) {

    // Perform password authentication and JWT exchange
    result = await adaptive.evaluatePassword(context,
      result.transactionId,
      process.env.PASSWORD_IDENTITY_SOURCE_ID,
      username, password);

    console.log("After First Factor: " + JSON.stringify(result));
  }
}

main();
