#!/bin/bash

# Clone the SDK repo if it doesn't exist
if [ ! -d "./verify-sdk-javascript" ]; then
  git clone https://github.com/rbaronia/verify-sdk-javascript.git ./verify-sdk-javascript
fi

echo "SDK repo is ready. Now run: npm install"
