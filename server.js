const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); // optional
//const uuidv1 = require('uuid/v1'); // optional
const session = require('express-session');
const createError = require('http-errors');

const Adaptive = require('adaptive-proxy-sdk');
const OAuthClientCreds = require('./oauth-client-creds.js').OAuthClientCreds;
const User = require('./verify-user-sdk/lib/index.js').User;

const path = require('path');
const app = express();

app.use(cookieParser('secret')); // optional
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// load contents of .env into process.env
require('dotenv').config();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Define static resources
app.use('/static', express.static(__dirname + '/static'));

// Define resources required for adaptive access.  Read from browser SDK package.
app.use('/static/adaptive-v1.js', express.static(__dirname + '/node_modules/adaptive-browser-sdk/dist/adaptive-v1.min.js'));
app.use('/icons/blank.gif', express.static(__dirname + '/node_modules/adaptive-browser-sdk/blank.gif'));

var login = require('./routes/login');
var mfa = require('./routes/mfa');
var register = require('./routes/register');
var myaccount = require('./routes/myaccount');
var fido = require('./routes/fido');

app.use('/login', login);
app.use('/mfa', mfa);
app.use('/register', register);
app.use('/myaccount', myaccount);
app.use('/fido', fido);

const clientAuthConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
};

var clientOauthClient;
if (clientAuthConfig.clientId) {
  const clientOauthClient = new OAuthClientCreds(clientAuthConfig);
  app.set('verifyClient', clientOauthClient);
}

const adaptiveConfig = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.APP_CLIENT_ID,
  clientSecret: process.env.APP_CLIENT_SECRET,
};
if(adaptiveConfig.clientId) {
  const adaptive = new Adaptive(adaptiveConfig);
  app.set('adaptiveClient', adaptive);
}

const mustBeAuthenticated = (req, res, next) => {
  if (!req.session.authenticated) {
    res.redirect('login');
  } else {
    next();
  }
};

app.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/home');
  } else {
    res.render('ecommerce-home');
  }
});

app.get('/home', mustBeAuthenticated, (req, res) => {
  res.render('ecommerce-memberhome');
});

app.get('/cart', mustBeAuthenticated, async (req, res) => {
  let scim;
  if (!req.session.user) {
    let user = new User(clientAuthConfig,{accessToken: req.session.token.access_token});
    scim = await user.getUser();
    req.session.user = scim;
  } else {
    scim = req.session.user;
  }
  res.render('ecommerce-cart', scim);
});

app.get('/results', (req, res) => {
  res.render('ecommerce-search-results');
});

app.get('/details', (req, res) => {
  res.render('ecommerce-product-details');
});

app.get('/success', mustBeAuthenticated, (req, res) => {
  res.render('ecommerce-success');
});

app.post('/checkout', mustBeAuthenticated, async (req, res) => {
  let user = new User(clientAuthConfig,{accessToken: req.session.token.access_token});
  let currentUser = req.session.user;

  if (req.body.storemobile == "on") {
    if (!currentUser.phoneNumbers) currentUser.phoneNumbers = [];
    currentUser.phoneNumbers[0] = {type: "mobile", value: req.body.mobile};
  }

  if (req.body.storeaddress == "on") {
    if (!currentUser.addresses) currentUser.addresses = [];
    currentUser.addresses[0] = {type: "work",
      streetAddress: req.body.street,
      locality: req.body.city,
      region: req.body.region,
      country: req.body.country
    };
  }

  let result = await user.updateUser(currentUser);
  req.session.user = result;

  res.redirect('/success');
});

app.post('/search', (req, res) => {
  res.redirect('/results');
});

// delete token from storage
app.get('/logout', (req, res) => {
  // get id from cookie
  delete req.session.authenticated;
  delete req.session.token;
  delete req.session.user;
  res.redirect('/');
});

app.get('/api/userinfo', (req, res) => {
  clientOauthClient.userInfo(req.session.token)
  .then(r => {
    res.json(r);
  }).catch((err) => {
    res.json(err);
  });
});

// catch 404 and forward to error handler
app.use(function(_req, _res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, _next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('ecommerce-error');
});

// Listen for requests.  HTTPS is needed for FIDO2.
// Generate keys using create-crypto.sh
if (process.env.FIDO2_ORIGIN) {
	https.createServer({
	    key: fs.readFileSync('./local.iamlab.key.pem'),
	    cert: fs.readFileSync('./local.iamlab.cert.pem')
	}, app)
	.listen(3443, function() {
	  	console.log('Your SSL app is listening on port 3443');
	});
} else {
	const listener = app.listen(3000, function() {
	  	console.log('Your app is listening on port ' + listener.address().port);
	});
}
