#!/bin/bash

# Set current project root
PROJ_ROOT=$(pwd)

# Get command line arguments
while getopts :uisl OPTION
do
    case "${OPTION}" in
        u) RUN_OSS_UNIT=true;;
        i) RUN_OSS_INTEG=true;;
        s) RUN_OSS_STYLE=true;;
        l) RUN_LOCAL=true;;
        ?) printf "script usage: $(basename $0) [-u] [-i] [-s] [-l]\n"; exit 1;;
    esac
done

if [ "$RUN_LOCAL" = true ]; then
    CYPRESS_ENV_VAR='true';
else
    CYPRESS_ENV_VAR='false';
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
    printf "\nNOT IMPLEMENTED\n"
    # PASS_STYLE_CHECK=$([[ $? -eq 0 ]] && echo true || echo false)
    PASS_STYLE_CHECK=false

    TEST_NAMES+=("OSS Style Check")
    TEST_RESULTS+=($PASS_STYLE_CHECK)
    updateNumTestsPassed $PASS_STYLE_CHECK
fi

# Run Code Editor UI tests
printf "\n======== Running Code Editor UI tests ========\n"
yarn --cwd "${PROJ_ROOT}/test/" cypress run --env RUN_LOCAL="${CYPRESS_ENV_VAR}"
PASS_CODE_EDITOR_UI_TESTS=$([[ $? -eq 0 ]] && echo true || echo false)

TEST_NAMES+=("Code Editor UI Tests")
TEST_RESULTS+=($PASS_CODE_EDITOR_UI_TESTS)
updateNumTestsPassed $PASS_CODE_EDITOR_UI_TESTS


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
