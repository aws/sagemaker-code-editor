#!/bin/bash

VERBOSE_FLAG=$([[ "$1" == "--verbose" ]] && echo "--verbose" || echo "")

# set +e to prevent quilt from exiting when no patches popped
set +e

# Set current project root
PROJ_ROOT=$(pwd)

# Clean out patches
printf "\n======== Cleaning out patches ========\n"
quilt pop -a

# re-enable -e to allow exiting on error
set -e

# make sure module is current
printf "\n======== Updating submodule ========\n"
git submodule update --init

# Apply patches
printf "\n======== Applying patches ========\n"
{
    quilt push -a --leave-rejects --color=auto 
} || {
        printf "\nPatching error, review logs!\n"
        find ./vscode -name "*.rej"
        exit 1
}

# Comment out breaking lines in postinstall.js
printf "\n======== Comment out breaking git config lines in postinstall.js ========\n"
sh ${PROJ_ROOT}/scripts/postinstall.sh

# Copy resources
printf "\n======== Copy resources ========\n"
sh ${PROJ_ROOT}/scripts/copy-resources.sh

# Delete node_modules to prevent node-gyp build error
printf "\n======== Deleting vscode/node_modules ========\n"
rm -rf "${PROJ_ROOT}/vscode/node_modules"

# Build the project
printf "\n======== Building project in ${PROJ_ROOT}/vscode ========\n"
yarn --cwd "${PROJ_ROOT}/vscode" install --pure-lockfile ${VERBOSE_FLAG}
yarn --cwd "${PROJ_ROOT}/vscode" download-builtin-extensions
