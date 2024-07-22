#!/bin/bash

show_help() {
    printf "Usage: $(basename $0) -w <WEBSITE-URL> [OPTIONS]\n\n"
    printf "Options:\n"
    printf "  -w '<WEBSITE-URL>'  Required. The URL of the website to test.\n"
    printf "  -u                Run OSS unit tests.\n"
    printf "  -i                Run OSS integration tests.\n"
    printf "  -s                Run OSS style check.\n"
    printf "  -c                Run Code Editor UI tests.\n"
    printf "  -l                Run Code Editor UI tests against a local instance (requires -c).\n"
    printf "  -h                Show this help message and exit.\n"
}

usage() {
    printf "script usage: $(basename $0) -w '<WEBSITE-URL>' [-u] [-i] [-s] [-c] [-l] [-h]\n" >&2
    exit 1
}

# Set current project root
PROJ_ROOT=$(pwd)

# Initialize variables to track if -w, -c, and -l are provided
W_FLAG_PROVIDED=false
C_FLAG_PROVIDED=false
L_FLAG_PROVIDED=false

# Get command line arguments
while getopts :w:uislch OPTION
do
    case "${OPTION}" in
        w) WEBSITE="${OPTARG}"; W_FLAG_PROVIDED=true ;;
        u) RUN_OSS_UNIT=true ;;
        i) RUN_OSS_INTEG=true ;;
        s) RUN_OSS_STYLE=true ;;
        c) RUN_CYPRESS_INTEG=true; C_FLAG_PROVIDED=true ;;
        l) RUN_LOCAL=true; L_FLAG_PROVIDED=true ;;
        h) show_help; exit 0 ;;
        :) printf "Error: -${OPTARG} requires an argument.\n" >&2; exit 1 ;;
        ?) usage ;;
    esac
done

# Check if -w flag was provided
if ! $W_FLAG_PROVIDED; then
    printf "Error: -w <WEBSITE-URL> is required.\n" >&2
    usage
fi

# Check if -l flag is provided without -c flag
if $L_FLAG_PROVIDED && ! $C_FLAG_PROVIDED; then
    printf "Error: -l flag can only be used when -c flag is also present.\n" >&2
    usage
fi

TEST_NAMES=()
TEST_RESULTS=()
NUM_TESTS_PASSED=0

updateNumTestsPassed() {
    if [ "$1" = true ]; then
        NUM_TESTS_PASSED=$(($NUM_TESTS_PASSED+1))
    fi
}

# Run unit tests
if [ "$RUN_OSS_UNIT" = true ]; then
    printf "\n======== Running OSS unit tests ========\n"
    yarn --cwd "${PROJ_ROOT}/vscode" test-browser --browser chromium
    PASS_UNIT_TESTS=$([[ $? -eq 0 ]] && echo true || echo false)

    TEST_NAMES+=("OSS Unit Tests")
    TEST_RESULTS+=($PASS_UNIT_TESTS)
    updateNumTestsPassed $PASS_UNIT_TESTS
fi

# Run integration tests
if [ "$RUN_OSS_INTEG" = true ]; then
    printf "\n======== Running OSS integration tests ========\n"
    yarn --cwd "${PROJ_ROOT}/vscode/test/integration/browser"
    yarn --cwd "${PROJ_ROOT}/vscode/test/integration/browser" compile
    sh ${PROJ_ROOT}/vscode/scripts/test-web-integration.sh --browser chromium
    PASS_INTEG_TESTS=$([[ $? -eq 0 ]] && echo true || echo false)

    TEST_NAMES+=("OSS Integration Tests")
    TEST_RESULTS+=($PASS_INTEG_TESTS)
    updateNumTestsPassed $PASS_INTEG_TESTS
fi

# Run style checks
if [ "$RUN_OSS_STYLE" = true ]; then
    printf "\n======== Running OSS style check ========\n"
    yarn --cwd "${PROJ_ROOT}/vscode" eslint 
    PASS_STYLE_CHECK=$([[ $? -eq 0 ]] && echo true || echo false)

    TEST_NAMES+=("OSS Style Check")
    TEST_RESULTS+=($PASS_STYLE_CHECK)
    updateNumTestsPassed $PASS_STYLE_CHECK
fi

# Run Code Editor UI tests
if [ "$RUN_CYPRESS_INTEG" = true ]; then
    if [ "$RUN_LOCAL" = true ]; then
        printf "\n======== Running Code Editor UI tests against local instance ========\n"
        yarn --cwd "${PROJ_ROOT}/test/integ" cypress run --config-file cypress.local.config.ts --env WEBSITE="${WEBSITE}"
        else
        printf "\n======== Running Code Editor UI tests against hosted instance ========\n"
        yarn --cwd "${PROJ_ROOT}/test/integ" cypress run --config-file cypress.hosted.config.ts --env WEBSITE="${WEBSITE}" 
    fi
    PASS_CODE_EDITOR_UI_TESTS=$([[ $? -eq 0 ]] && echo true || echo false)

    TEST_NAMES+=("Code Editor UI Tests")
    TEST_RESULTS+=($PASS_CODE_EDITOR_UI_TESTS)
    updateNumTestsPassed $PASS_CODE_EDITOR_UI_TESTS
fi


# Print results
printf "\n======== Results ========\n"
printf "\n\e[4mPassed ${NUM_TESTS_PASSED} out of ${#TEST_RESULTS[@]} tests\e[0m\n\n"
NUM_TESTS=${#TEST_NAMES[@]}
for (( i=0; i<${NUM_TESTS}; i++ ));
do
    if [ ${TEST_RESULTS[i]} == true ]; then
        printf "\e[32m✓\e[0m ${TEST_NAMES[i]}\n"
    else
        printf "\e[31m✖\e[0m ${TEST_NAMES[i]}\n"
    fi
done

if [ "$NUM_TESTS_PASSED" -eq "$NUM_TESTS" ]; then
    exit 0
else
    exit 1
fi
