#!/bin/bash

while getopts "v:" opt; do
  case $opt in
    v) version="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    exit 1
    ;;
  esac

  case $OPTARG in
    -*) echo "Option $opt needs a valid argument"
    exit 1
    ;;
  esac
done

if [[ -z $version ]]; then
 echo "Please provide version using '-v'";
 exit 1
fi

VERSION=$version
# Set current project root
PROJ_ROOT=$(pwd)

mkdir -p ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}
rm -rf ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}/src
mkdir -p ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}/src
cp -a ${PROJ_ROOT}/vscode/. ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}/src/
rm -rf ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}.tar.gz
cd ${PROJ_ROOT}/sagemaker-code-editor
tar -czf code-editor${VERSION}.tar.gz code-editor${VERSION}
cd ${PROJ_ROOT}
cp ${PROJ_ROOT}/sagemaker-code-editor/code-editor${VERSION}.tar.gz ${PROJ_ROOT}/
rm -rf ${PROJ_ROOT}/sagemaker-code-editor
sha256sum ${PROJ_ROOT}/code-editor${VERSION}.tar.gz
