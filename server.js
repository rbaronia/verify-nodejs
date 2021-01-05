const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); // optional
//const uuidv1 = require('uuid/v1'); // optional
const session = require('express-session');
const createError = require('http-errors');

const OAuthClientCreds = require('./oauth-client-creds.js').OAuthClientCreds;
const User = require('./verify-nativeapp-sdk/lib/index.js').User;

const path = require('path');
const app = express();

app.use(cookieParser('secret')); // optional
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Define static resources
app.use('/static', express.static(__dirname + '/static'));

var login = require('./routes/login');
var mfa = require('./routes/mfa');
var register = require('./routes/register');
var myaccount = require('./routes/myaccount');

app.use('/login', login);
app.use('/mfa', mfa);
app.use('/register', register);
app.use('/myaccount', myaccount);

// load contents of .env into process.env
require('dotenv').config();

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
    let user = new User(clientAuthConfig,req.session.token.access_token);
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
  let user = new User(clientAuthConfig,req.session.token.access_token);
  let currentUser = req.session.user;

  if (req.body.storemobile == "on") {
    currentUser.phoneNumbers[0] = {type: "mobile", value: req.body.mobile};
  }

  if (req.body.storeaddress == "on") {
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

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
