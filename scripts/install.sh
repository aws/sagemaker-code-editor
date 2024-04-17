#!/bin/bash
set -e

# Set current project root
PROJ_ROOT=$(pwd)

# Clean out patches
printf "\n======== Cleaning out patches ========\n"
quilt pop -a

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

# Copy resources
printf "\n======== Copy resources ========\n"
sh ${PROJ_ROOT}/scripts/copy-resources.sh

# Build the project
printf "\n======== Building project in ${PROJ_ROOT}/vscode ========\n"
yarn --cwd "${PROJ_ROOT}/vscode" install --pure-lockfile --verbose
yarn --cwd "${PROJ_ROOT}/vscode" download-builtin-extensions
