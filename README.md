# IBM Security Verify Node.js Demo Application

This repository contains a demonstration consumer application that uses IBM Security Verify to provide:
- User registration
- Policy-based authentication (first-factor and optional multi-factor)
- Account management

The application leverages the IBM Security Verify Adaptive SDK for all core functionality.

A step-by-step setup guide and REST API exploration (using Postman) would be provided.

---

## Features
- Registration and login with IBM Security Verify
- Support for multi-factor authentication (MFA)
- Account management capabilities
- Adaptive Access support (optional)
- FIDO2 authentication (optional)

---

## Project Structure
- `/views/` &mdash; Handlebars templates for UI
- `/routes/` &mdash; Express route handlers
- `/public/` &mdash; Static assets (JS, CSS, images)
- `app.js` &mdash; Main application entry point
- `.env` &mdash; Environment configuration

---

# Installation
Follow these steps to install the application on your system.

## Prerequisites
- Node.js and npm (Node Package Manager)
- Git (for cloning the repository)

## Clone this repository
```bash
git clone https://github.com/rbaronia/verify-nodejs.git
cd verify-nodejs
```

## Install dependencies
Before installing dependencies, add execute permission and run the setup script in one line:
```bash
chmod +x setup.sh && ./setup.sh
npm install
```

# IBM Security Verify Configuration
Before using this application, configure your IBM Security Verify tenant as follows:

## Create a Native Web Policy
In IBM Security Verify, create a new "Native Web App" policy.  Initially, take all the defaults.
- Later you can modify the requirements for first factor and multi-factor authentication.

## Create Application
In IBM Security Verify, create a custom application with the following properties:
Configuration Item | Value
--- | ---
Sign-on method | Open ID Connect 1.0
Application URL | http://localhost:3000
Grant types | JWT bearer, Context-based authorization
Send all known user attributes in the ID token | Checked
Access policy | Choose the Native Web App policy you created above

Save the application.

Under "Entitlements" Set the entitlements for the application to "Automatic access for all users and groups"

Under "API access", edit the application client and add the following access:
- Authenticate any user
- Read second-factor authentication enrollment for all users

Add an additional (privileged) API client and give it the following access:
- Manage second-factor authentication enrollment for all users
- Manage users and standard groups

# Application Configuration
The sample application is configured using a `.env` file.

1. Copy the sample environment file:
   ```bash
   cp dotenv.sample .env
   ```
2. Edit `.env` and fill in your IBM Security Verify tenant and application details:
   ```env
   TENANT_URL=https://xxxxx.verify.ibm.com
   APP_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   APP_CLIENT_SECRET=xxxxxxxxxx
   CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   CLIENT_SECRET=xxxxxxxxxx
   AUTHENTICATOR_PROFILEID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   FIDO2_RP_UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ADAPTIVE_ENABLED=false
   ADAPTIVE_OVERRIDE_IP=
   SESSION_SECRET=somethinghardtoguess
   SCOPE=oidc
   ```

- **TENANT_URL**: Your IBM Security Verify tenant URL
- **APP_CLIENT_ID/SECRET**: In "Sign-on" tab of your application definition
- **CLIENT_ID/SECRET**: In the privileged client under "API access" tab
- **AUTHENTICATOR_PROFILEID**: Under Security → Registration profiles
- **FIDO2_RP_UUID**: See [FIDO2 section](#fido2) below
- **ADAPTIVE_ENABLED**: Set to `true` to enable Adaptive Access
- **ADAPTIVE_OVERRIDE_IP**: (Optional) Your public IP if running locally

# Running the Application
After completing the steps above, start the application:
```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

# Adaptive Access (Optional)
This application can demonstrate Adaptive Access if your IBM Security Verify tenant supports it.

1. **On-board your Application**
   - In your application definition, go to the **Adaptive sign-on** tab and enter an *Allowed domain* (e.g., `myapp.local`).
   - Set up a local alias in `/etc/hosts` if needed.
   - Click **Generate** to start onboarding. This can take an hour or more.
   - When onboarding completes, copy the provided web snippet.
2. **Add the Web Snippet**
   - Open `views/ecommerce-login.hbs` and find:
     ```html
     <!-- Paste web snippet here for Adaptive -->
     ```
   - Paste the snippet at this location.
3. **Enable Adaptive in `.env`**
   - Set `ADAPTIVE_ENABLED=true` in your `.env` file.
4. **Override Local IP (if needed)**
   - Set `ADAPTIVE_OVERRIDE_IP=<your_public_ip>` in `.env` if running locally. (Find your IP at https://www.whatismyip.com/)
5. **Enable Adaptive Access in Policy**
   - In your Native Web App policy, enable Adaptive Access and set post-authentication rules appropriately.

# FIDO2 (Optional)
To enable FIDO2 authentication:

1. Access the application with a fully-qualified hostname (e.g., `myapp.local`). Set up a local alias if needed.
2. In IBM Security Verify Admin UI:
   - Go to **Authentication → FIDO2 Settings**
   - Create a new Relying Party with the identifier set to your application's hostname (no port numbers)
   - Select *Include all device metadata*
   - Add the application's base URL (include port if not 80/443)
   - Save the Relying Party
3. Obtain the **RP UUID** using browser dev tools (see REST request for `/metadata`).

---

# Troubleshooting

## Cannot find module '@ibm-verify/adaptive-proxy'

If you see an error like:

```
Error: Cannot find module '@ibm-verify/adaptive-proxy'
```

or

```
Error: Cannot find module '/.../node_modules/@ibm-verify/adaptive-proxy/sdk/adaptive-proxy/lib/index.js'. Please verify that the package.json has a valid "main" entry
```

**Resolution:**
1. Make sure you have run `./setup.sh` before `npm install`.
2. If the error persists, update the `main` field in `verify-sdk-javascript/sdk/adaptive-proxy/package.json` to:
   ```json
   "main": "lib/index.js"
   ```
3. Remove `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. Then start the application:
   ```bash
   npm start
   ```
