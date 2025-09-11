#!/bin/bash

# ONLY FOR LOCAL BUILD USECASE
# This script is intended to be run inside the docker container
# It will setup the environment and build the project within the container

# set +e to prevent quilt from exiting when no patches popped
set +e

# Set current project root
PROJ_ROOT=$(pwd)

# Clean out patches
printf "\n======== Cleaning out patches ========\n"
quilt pop -a
rm -rf .pc

# re-enable -e to allow exiting on error
set -e

# make sure module is current
printf "\n======== Updating submodule ========\n"
git submodule update --init

# Apply patches
printf "\n======== Applying patches ========\n"

if [ -d patches ] && [ "$(ls -A patches)" ]; then
  {
    quilt push -a --leave-rejects --color=auto 
  } || {
    printf "\nPatching error, review logs!\n"
    find ./vscode -name "*.rej"
    exit 1
  }
fi


# Generate Licenses
printf "\n======== Generate Licenses ========\n"
cd ${PROJ_ROOT}/vscode
cp LICENSE.txt LICENSE.vscode.txt
cp ThirdPartyNotices.txt LICENSE-THIRD-PARTY.vscode.txt
cp ../LICENSE-THIRD-PARTY .

cd ${PROJ_ROOT}
# Comment out breaking lines in postinstall.js
printf "\n======== Comment out breaking git config lines in postinstall.js ========\n"
sh ${PROJ_ROOT}/scripts/postinstall.sh

# Copy resources
printf "\n======== Copy resources ========\n"
${PROJ_ROOT}/scripts/copy-resources.sh

# Build the project
printf "\n======== Building project in ${PROJ_ROOT}/vscode ========\n"
cd ${PROJ_ROOT}/vscode
npm config set cache ~/.npm --global
npm install -g node-gyp
npm install --use-cache --no-audit --no-fund --prefer-offline --verbose --no-optional
npm run download-builtin-extensions --prefer-offline --verbose
