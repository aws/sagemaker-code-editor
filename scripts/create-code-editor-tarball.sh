#!/bin/bash

while getopts "v:m" opt; do
  case $opt in
    v) version="$OPTARG"
    ;;
    ?) usage; exit 1 ;;
  esac
done

if [[ -z $version ]]; then
 echo "Please provide version using '-v'";
 exit 1
fi

VERSION=$version

# Set current project root
PROJ_ROOT=$(pwd)

pushd ${PROJ_ROOT}/vscode

printf "\n======== Running gulp build task ========\n"
export DISABLE_V8_COMPILE_CACHE=1
export UV_THREADPOOL_SIZE=4
export ARCH_ALIAS=linux-x64
export NODE_ENV=production
export MINIFY=true
node --max-old-space-size=16384 --optimize-for-size \
    ./node_modules/gulp/bin/gulp.js \
    "vscode-reh-web-${ARCH_ALIAS}${MINIFY:+-min}"

popd

TARBALL="sagemaker-code-editor-${VERSION}.tar.gz"
BUILD_DIR_PATH=.artifacts

mv vscode-reh-web-linux-x64 sagemaker-code-editor
mkdir ${BUILD_DIR_PATH}
tar -czf ${BUILD_DIR_PATH}/${TARBALL} sagemaker-code-editor 
sha256sum ${BUILD_DIR_PATH}/${TARBALL}
