#!/usr/bin/env bash
set -euo pipefail

# This script requires vscode to be built with matching MINIFY.

# MINIFY controls whether minified vscode is bundled.
MINIFY="${MINIFY-true}"

# KEEP_MODULES controls whether the script cleans all node_modules requiring a yarn install
# to run first.
KEEP_MODULES="${KEEP_MODULES-0}"

main() {
  cd "$(dirname "${0}")/../.."

  source ./ci/lib.sh

  VSCODE_SRC_PATH="vscode"
  VSCODE_OUT_PATH="$RELEASE_PATH/vscode"

  create_shrinkwraps

  mkdir -p "$RELEASE_PATH"

  bundle_vscode

}

bundle_vscode() {
  mkdir -p "$VSCODE_OUT_PATH"

  local rsync_opts=()
  if [[ ${DEBUG-} = 1 ]]; then
    rsync_opts+=(-vh)
  fi

  # Some extensions have a .gitignore which excludes their built source from the
  # npm package so exclude any .gitignore files.
  rsync_opts+=(--exclude .gitignore)

  # Exclude Node as we will add it ourselves for the standalone and will not
  # need it for the npm package.
  rsync_opts+=(--exclude /node)

  # Exclude Node modules.
  if [[ $KEEP_MODULES = 0 ]]; then
    rsync_opts+=(--exclude node_modules)
  fi

  rsync "${rsync_opts[@]}" ./lib/vscode-reh-web-*/ "$VSCODE_OUT_PATH"

  # Use the package.json for the web/remote server.  It does not have the right
  # version though so pull that from the main package.json.
  jq --slurp '.[0] * {version: .[1].version}' \
    "$VSCODE_SRC_PATH/remote/package.json" \
    "$VSCODE_SRC_PATH/package.json" > "$VSCODE_OUT_PATH/package.json"

  mv "$VSCODE_SRC_PATH/remote/npm-shrinkwrap.json" "$VSCODE_OUT_PATH/npm-shrinkwrap.json"

  # Include global extension dependencies as well.
  rsync "$VSCODE_SRC_PATH/extensions/package.json" "$VSCODE_OUT_PATH/extensions/package.json"
  mv "$VSCODE_SRC_PATH/extensions/npm-shrinkwrap.json" "$VSCODE_OUT_PATH/extensions/npm-shrinkwrap.json"
  rsync "$VSCODE_SRC_PATH/extensions/postinstall.mjs" "$VSCODE_OUT_PATH/extensions/postinstall.mjs"
}

create_shrinkwraps() {
  # yarn.lock or package-lock.json files (used to ensure deterministic versions of dependencies) are
  # not packaged when publishing to the NPM registry.
  # To ensure deterministic dependency versions (even when code-server is installed with NPM), we create
  # an npm-shrinkwrap.json file from the currently installed node_modules. This ensures the versions used
  # from development (that the yarn.lock guarantees) are also the ones installed by end-users.
  # These will include devDependencies, but those will be ignored when installing globally (for code-server), and
  # because we use --omit=dev when installing vscode.

  # We first generate the shrinkwrap file for code-server itself - which is the current directory
  create_shrinkwrap_keeping_yarn_lock

  # Then the shrinkwrap files for the bundled VSCode
  pushd "$VSCODE_SRC_PATH/remote/"
  create_shrinkwrap_keeping_yarn_lock
  popd

  pushd "$VSCODE_SRC_PATH/extensions/"
  create_shrinkwrap_keeping_yarn_lock
  popd
}

create_shrinkwrap_keeping_yarn_lock() {
  # HACK@edvincent: Generating a shrinkwrap alters the yarn.lock which we don't want (with NPM URLs rather than the Yarn URLs)
  # But to generate a valid shrinkwrap, it has to exist... So we copy it to then restore it
  cp yarn.lock yarn.lock.temp
  npm shrinkwrap
  cp yarn.lock.temp yarn.lock
  rm yarn.lock.temp
}

main "$@"