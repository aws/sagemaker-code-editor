#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -ex

# Set current project root
PROJ_ROOT=$(pwd)

# Define the destination base directory
POSTINSTALL_JS_PATH="${PROJ_ROOT}/vscode/build/npm/postinstall.js"

# Check if the postinstall.js file exists
if [ ! -f "$POSTINSTALL_JS_PATH" ]; then
    echo "Error: $POSTINSTALL_JS_PATH does not exist." >&2
    exit 1
fi

# set +e to prevent script from exiting when not on macOS
set +e

# Check if on macOS
system_profiler SPSoftwareDataType

# Run with different arguments depending on the OS
if [ $? -eq 0 ]; then
    # Use sed to comment out the specific lines
    sed -i '' '/cp\.execSync('"'"'git config .*);/s/^/\/\/ /' "$POSTINSTALL_JS_PATH"
else
    # Use sed to comment out the specific lines
    sed -i '/cp\.execSync('"'"'git config .*);/s/^/\/\/ /' "$POSTINSTALL_JS_PATH"
fi

echo "Specified git config lines have been commented out in $POSTINSTALL_JS_PATH."
