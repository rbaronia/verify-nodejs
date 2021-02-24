# Introduction
This repository holds a demonstration consumer application which uses IBM Security Verify to provide registration, policy-based authentication (first-factor and optional multi-factor), and account management.  It uses native APIs for all functionality.

# Installation
Follow these steps to install the application on your system.

## Pre-requistes
You must have NodeJS installed and the npm (node package manager).  In order to clone the repository you will need to have git installed.

## Clone this repository
If you have git installed you can clone this repository with the command:
```bash
git clone https://github.com/iamexploring/verify-nodejs
```
## Load download required node packages
Run the following commands to download the packages to the cloned application directory:
```bash
cd verify-nodejs
npm install
```

# IBM Security Verify configuration
Before you can use this application, you must configure your IBM Securiy Verify tenant to work with it.

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

# Configure Application
The sample application is configured using a .env file.
First, copy the dotenv.sample file:
```bash
cp dotenv.sample .env
```

Complete the .env file.  It has the following content:

```
TENANT_URL=https://xxxxx.verify.ibm.com

APP_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APP_CLIENT_SECRET=xxxxxxxxxx

CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=xxxxxxxxxx

AUTHENTICATOR_PROFILEID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

ADAPTIVE_ENABLED=false

SESSION_SECRET=somethinghardtoguess
SCOPE=oidc
```

The TENANT_URL is the URL for your IBM Security Verify tenant.

The other values can be found in the following locations in the IBM Security Verify admin UI:
Parameter(s) | Location
--- | ---
APP_CLIENT_ID and APP_CLIENT_SECRET | In "Sign-on" tab of the application definition.
CLIENT_ID and CLIENT_SECRET | In properties of the privileged client you created under "API access" tab of the application definition.
AUTHENTICATOR_PROFILEID | Under Security-->Registration profiles, select and entry and copy the Profile ID from details pane.
ADAPTIVE_ENABLED | Set to true to enable Adaptive Access functionality.  See below for additional pre-requisites.

# Start the application
Once you have completed the steps above, you can start the application with this command:
```bash
npm start
```

You can connect to the application at http://localhost:3000

# Adaptive access
This application can be used to demonstrate Adaptive Access if this is available in your IBM Security Verify tenant.  Follow the steps below.

## On-board your Application
In the Application definition, go to the **Adaptive sign-on** tab and enter an *Allowed domain*.  You must access the application using a host within this domain in order for Adaptive Access to function correctly.  Set up an alias in your local /etc/hosts file if you don't have a real DNS host.

Click **Generate**.  This starts the on-boarding process.  It can take some time (an hour or more) to complete.  You can leave the page and check back later.

When the on-boarding is complete, the page will show a web snippet.  You will need to add this to the application login page.

## Add web snippet to login page
Open the *views/ecommerce-login.hbs* file.  In this file, locate the line:

```
  	<!-- Paste web snippet here for Adaptive -->
```

Paste the web snippet from the application definition into the page at this point.

## Enable Adaptive function in .env file
In the *.env* file, set `ADAPTIVE_ENABLED=true`.

## Enable Adaptive Access in your Native Web App policy
In the Native Web App policy that is associated with your application, enable Adaptive Access.  Initially at least you should set your post-authentication rules to allow access (so that only Adaptive Access is controlling the need for 2nd Factor Authentication).
