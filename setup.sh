#!/bin/bash

# Clone the SDK repo if it doesn't exist
if [ ! -d "./verify-sdk-javascript" ]; then
  git clone https://github.com/rbaronia/verify-sdk-javascript.git ./verify-sdk-javascript
fi

# Patch the main field in adaptive-proxy package.json if needed
ADAPTIVE_PKG_JSON="./verify-sdk-javascript/sdk/adaptive-proxy/package.json"
if [ -f "$ADAPTIVE_PKG_JSON" ]; then
  MAIN_FIELD=$(grep '"main"' "$ADAPTIVE_PKG_JSON" | head -1)
  if [[ $MAIN_FIELD != *'lib/index.js'* ]]; then
    # Use jq if available for robust JSON editing
    if command -v jq &> /dev/null; then
      jq '.main = "lib/index.js"' "$ADAPTIVE_PKG_JSON" > "$ADAPTIVE_PKG_JSON.tmp" && mv "$ADAPTIVE_PKG_JSON.tmp" "$ADAPTIVE_PKG_JSON"
      echo "Patched main field in adaptive-proxy package.json to lib/index.js using jq."
    else
      # Fallback to sed for simple replacement
      sed -i '' 's#"main": ".*"#"main": "lib/index.js"#' "$ADAPTIVE_PKG_JSON"
      echo "Patched main field in adaptive-proxy package.json to lib/index.js using sed."
    fi
  fi
fi

echo "SDK repo is ready. Now run: npm install"
