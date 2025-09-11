#!/bin/bash

usage() {
  printf """
Usage: $0 [-t <VERSION>] [-v] [-h]

Otions:
  -t <VERSION>    Create a tarball with the specified version
  -v              Enable verbose output
  -h              Show this help message
"""
}

while getopts "t:hv" opt; do
  case $opt in
    t)  version="$OPTARG"
        CREATE_TARBALL=true ;;
    v)  VERBOSE_ARG="--verbose" ;;
    h)  usage; exit 0 ;;
    :)  printf "Error: -${OPTARG} requires an argument.\n" >&2; exit 1 ;;
    ?) usage; exit 1 ;;
  esac
done

VERSION=$version

# set +e to prevent quilt from exiting when no patches popped
set +e

# Set current project root
PROJ_ROOT=$(pwd)

# Clean out patches
printf "\n======== Cleaning out patches ========\n"
quilt pop -a
rm -rf .pc

# empty vscode module
printf "\n======== Delete data in vs code module if present ========\n"
rm -rf ${PROJ_ROOT}/vscode/.

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

# Delete node_modules to prevent node-gyp build error and reduce tarball size
printf "\n======== Deleting vscode/node_modules ========\n"
find "${PROJ_ROOT}/vscode" -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Create tarball
if [ "$CREATE_TARBALL" = true ]; then
  # Build tarball for conda feedstock from vscode dir
  printf "\n======== Build Tarball for Conda Feedstock ========\n"
  bash ${PROJ_ROOT}/scripts/create_code_editor_tarball.sh -v ${VERSION}
fi

# Copy resources
printf "\n======== Copy resources ========\n"
${PROJ_ROOT}/scripts/copy-resources.sh

# Copy patched files to patches-vscode
cp -R vscode/* patched-vscode/

# Build the project
printf "\n======== Building project in ${PROJ_ROOT}/vscode ========\n"
# npm --cwd "${PROJ_ROOT}/vscode" install --pure-lockfile ${VERBOSE_ARG}
# npm --cwd "${PROJ_ROOT}/vscode" download-builtin-extensions
cd ${PROJ_ROOT}/vscode
npm install
npm download-builtin-extensions
