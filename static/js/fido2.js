var locationHostPort = location.hostname
        + (location.port ? ':' + location.port : '');
var baseURL = location.protocol + '//' + locationHostPort;
var csid = null;

function fidoRegister() {
  var options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  }

  fetch(baseURL + '/fido/attestation/options', options).then(response => {
    var status = response.status;
    response.json().then(data => {
      processAttestationOptionsResponse(status, data);
    });
  });
}

function b64urlToArrayBuf(base64url) {
var binaryString = window.atob(base64url
  .replace(/-/g, '+')
  .replace(/_/g, '/'));
var byteArray = new Uint8Array(binaryString.length);
for (var i = 0; i < binaryString.length; i++) {
  byteArray[i] = binaryString.charCodeAt(i);
}
return byteArray.buffer;
}

function arrayBufToB64url(byteArrayBuffer) {
var binaryString = '';
var byteArray = new Uint8Array(byteArrayBuffer);
for (var i = 0; i < byteArray.byteLength; i++) {
  binaryString += String.fromCharCode(byteArray[i]);
}
return window.btoa(binaryString)
  .replace(/\+/g, '-')
  .replace(/\//g, '_');
}

function processAttestationOptionsResponse(rspStatus, serverOptions) {

if (rspStatus == 200) {

  // Convert b64url fields into the ArrayBuffer type
  //required by WebAuthn API
  serverOptions.user.id = b64urlToArrayBuf(serverOptions.user.id);
  serverOptions.challenge = b64urlToArrayBuf(serverOptions.challenge);

  if (serverOptions["excludeCredentials"] != null
      && serverOptions["excludeCredentials"].length > 0) {
    for (var i = 0; i < serverOptions["excludeCredentials"].length; i++) {
      var b64uCID = serverOptions.excludeCredentials[i].id;
      serverOptions.excludeCredentials[i].id = b64urlToArrayBuf(b64uCID);
     }
   }

   var credCreateOptions = { "publicKey": serverOptions };
   console.log(credCreateOptions);
   // call the webauthn API
   navigator.credentials.create(credCreateOptions).then(handleCreateResult);
} else {
  console.log("Unable to obtain attestation options. rspStatus: "
              + rspStatus + " response: " + serverOptions);
}
}

function handleCreateResult(result) {
// success
var createResponse = result;
console.log("Received response from authenticator.");

// marshall the important parts of the response into an object which
// we'll later send to the server for validation.
// convert buffer arrays into base64url for sending in JSON.
attestationResponseObject = {
  "id": createResponse.id,
  "rawId": createResponse.id,
  "nickname": "My FIDO Authenticator",
  "type": "public-key",
  "response": {
    "clientDataJSON": arrayBufToB64url(createResponse.response.clientDataJSON),
    "attestationObject": arrayBufToB64url(createResponse.response.attestationObject)
  }
};

// if there are extensions results, include those
var clientExtensionResults = createResponse.getClientExtensionResults();
if (clientExtensionResults != null) {
  attestationResponseObject["getClientExtensionResults"] = clientExtensionResults;
}

var options = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(attestationResponseObject)
}

fetch(baseURL + '/fido/attestation/result', options).then(response => {
  var status = response.status;
  response.json().then(data => {
    if (status == 200) {
      if (data.success) {
        alert("Success");
      } else {
        alert("Failed: " + data.message);
      }
    } else {
      console.log("Unexpected HTTP response");
    }
  });
});
}

function fidoAuthenticate() {

  var options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  }

  fetch(baseURL + '/fido/assertion/options', options).then(response => {
    var status = response.status;
    response.json().then(data => {
      processAssertionOptionsResponse(status, data);
    });
  });
}

function processAssertionOptionsResponse(rspStatus, serverOptions) {

  if (rspStatus == 200) {

    // Convert Base64url fields to ArrayBuffers required by WebAuthn API
    serverOptions.challenge = b64urlToArrayBuf(serverOptions.challenge);

    if (serverOptions["allowCredentials"] != null
        && serverOptions["allowCredentials"].length > 0) {
      for (var i = 0; i < serverOptions["allowCredentials"].length; i++) {
        var b64uCID = serverOptions.allowCredentials[i].id;
        serverOptions.allowCredentials[i].id = b64urlToArrayBuf(b64uCID);
      }
    }

    var credRequestOptions = {
      "publicKey": serverOptions
    };

    // call the webauthn API
    navigator.credentials.get(credRequestOptions).then(checkAdaptive);
  } else {
    console.log("Unable to obtain assertion options. Response: "
                + serverOptions);
  }
}

function checkAdaptive(getResponse) {
  if (tmglobals.adaptive) {
    getSessionId().then( sessionId => {
      handleGetResult(getResponse,baseURL + '/fido/assertion/result?sess='
                                          + sessionId)
    });
  } else {
    handleGetResult(getResponse,baseURL + '/fido/assertion/result')
  }
}

function handleGetResult(getResponse,resultUrl) {

  // marshall the important parts of the response into an object
  // which we send to the server for validation.
  // ArrayBuffers are converted to Base64url for transmission as JSON.
  assertionResponseObject = {
    "id": getResponse.id,
    "rawId": getResponse.id,
    "type": "public-key",
    "response": {
      "clientDataJSON": arrayBufToB64url(getResponse.response.clientDataJSON),
          "authenticatorData": arrayBufToB64url(getResponse.response.authenticatorData),
          "signature": arrayBufToB64url(getResponse.response.signature),
          "userHandle": arrayBufToB64url(getResponse.response.userHandle)
    }
  };

  // if there are extensions results, include those
  var clientExtensionResults = getResponse.getClientExtensionResults();
  if (clientExtensionResults != null) {
    assertionResponseObject["getClientExtensionResults"] = clientExtensionResults;
  }

  // send to server for result processing
  var options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assertionResponseObject)
  }

  fetch(resultUrl, options).then(response => {
    var status = response.status;
    response.json().then(data => {
      if (status == 200) {
        if (data.success) {
          window.location="/login/logindone"
        } else {
          alert("Failed: " + data.message);
        }
      } else {
        console.log("Unexpected HTTP response");
      }
    });
  });
}
