#!/bin/bash

# ONLY FOR LOCAL DEV USECASE
# This script is intended to be run inside the docker container
# It will setup the environment and start the code editor in watch mode within the container

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
git config --global --add safe.directory /workspace
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

cd ${PROJ_ROOT}
# Comment out breaking lines in postinstall.js
printf "\n======== Comment out breaking git config lines in postinstall.js ========\n"
sh ${PROJ_ROOT}/scripts/postinstall.sh

# Copy resources
printf "\n======== Copy resources ========\n"
${PROJ_ROOT}/scripts/copy-resources.sh

# Build the project
printf "\n======== Installing dependencies ========\n"
cd ${PROJ_ROOT}/vscode

# Install dependencies
npm install
npm run download-builtin-extensions

printf "\n======== Starting Code Editor and Watch process using supervisord ========\n"

npm run watch &
sleep 300

# This script can be directly used to run code server without supervisord
# ./scripts/code-server.sh --host 0.0.0.0 --port 8000 --without-connection-token

# Create supervisord config to run code server
cat > /etc/supervisor/supervisord.conf << EOF
[unix_http_server]
file=/var/run/supervisor.sock

[supervisord]
logfile=/var/log/supervisord.log
pidfile=/var/run/supervisord.pid
nodaemon=false

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[include]
files = /etc/supervisor/conf.d/*.conf
EOF

# Start supervisor daemon
/usr/bin/supervisord -c /etc/supervisor/supervisord.conf &
sleep 2

# Create supervisor config file for code server
cat > /etc/supervisor/conf.d/vscode-server.conf << EOF
[program:vscode-server]
directory=/workspace/vscode
command=./scripts/code-server.sh --host 0.0.0.0 --port 8000 --without-connection-token
autostart=true
autorestart=true
stderr_logfile=/var/log/vscode-server.err.log
stdout_logfile=/var/log/vscode-server.out.log
EOF

# Reload supervisor config
supervisorctl reread
supervisorctl update

supervisorctl start vscode-server

# Keep container running and show logs
tail -f /var/log/vscode-*.log