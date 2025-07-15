#!/bin/bash

# Clone the SDK repo if it doesn't exist
if [ ! -d "./verify-sdk-javascript" ]; then
  git clone https://github.com/rbaronia/verify-sdk-javascript.git ./verify-sdk-javascript
fi

# Patch the main field in adaptive-proxy package.json if needed
ADAPTIVE_PKG_JSON="./verify-sdk-javascript/sdk/adaptive-proxy/package.json"
if [ -f "$ADAPTIVE_PKG_JSON" ]; then
  # Extract the value of the main field (removes whitespace, quotes, and comma)
  CURRENT_MAIN=$(grep '"main"' "$ADAPTIVE_PKG_JSON" | head -1 | awk -F: '{gsub(/[ \",]/, "", $2); print $2}')
  if [ "$CURRENT_MAIN" != "lib/index.js" ]; then
    if command -v jq &> /dev/null; then
      jq '.main = "lib/index.js"' "$ADAPTIVE_PKG_JSON" > "$ADAPTIVE_PKG_JSON.tmp" && mv "$ADAPTIVE_PKG_JSON.tmp" "$ADAPTIVE_PKG_JSON"
      echo "Patched main field in adaptive-proxy package.json to lib/index.js using jq."
    else
      sed -i '' 's#"main": *".*"#"main": "lib/index.js"#' "$ADAPTIVE_PKG_JSON"
      echo "Patched main field in adaptive-proxy package.json to lib/index.js using sed."
    fi
  else
    echo "Main field already set to lib/index.js, no patch needed."
  fi
else
  echo "adaptive-proxy/package.json not found!"
fi

echo "SDK repo is ready. Now run: npm install"
