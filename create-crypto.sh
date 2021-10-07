#!/bin/bash

# Get directory for this script
RUNDIR="`dirname \"$0\"`"         # relative
RUNDIR="`( cd \"$RUNDIR\" && pwd )`"  # absolutized and normalized
if [ -z "$RUNDIR" ] ; then
  echo "Failed to get local path"
  exit 1  # fail
fi

# Create a new RSA keypair and create self-signed x509 cert.
openssl req -newkey rsa -nodes -config cert_config -x509 -out local.iamlab.cert.pem -days 730
