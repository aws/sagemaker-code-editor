## SageMaker Code Editor

This is the repo for `sagemaker-code-editor`. For more information on Code Editor on SageMaker, please refer to: https://docs.aws.amazon.com/sagemaker/latest/dg/code-editor.html

The `patched-vscode` folder's only usage is to help reviewers review the patch changes. To ease reviewing patches (`.diff` files), whenever we raise a PR for adding/updating a patch, we will also apply the patches to this directory so that this folder's diff shows up in the PR.

Whenever we create a new branch with `vscode` pointing to a specific commit, this folder must be populated with the same contents as `vscode` at that particular commit.

## Patching Execution

To properly patch, please run script:

`sh ./scripts/install.sh`

This script will:

- use `quilt` to pop any existing patches.
- update the submodule to verify the local version is in parity with source
- apply all patches with `quilt` from `./patches`
- runs `./scripts/postinstall.sh` that will comment out 2 breaking `git config` lines from `./vscode/build/npm/postinstall.js`
- runs `./scripts/copy-resource.sh` that will copy patched version of code - oss from `./vscode` into `./patched-vscode` folder along with icon(s) and svg(s) from `./resources` folder
- runs `yarn install` and downloads built in extensions on patched submodule

## Local Setup

- Install Prerequisite tools described [here](https://web.archive.org/web/20231012223533/https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites) for your operating system.
- Run `sh ./scripts/install.sh`
- Run `yarn watch` from within the `vscode` folder
- Open a new terminal and run `./vscode/scripts/code-server.sh --launch`

<<<<<<< HEAD
## Make Commands

Available make targets for building and testing:

- `make build-cache` - Build SageMaker Code Editor with multi-stage npm cache
- `make build` - Build SageMaker Code Editor and output artifacts to ./artifacts
- `make install-act` - Install act (GitHub Actions runner) for local testing
- `make run-github` - Run complete GitHub Actions workflow locally using act
- `make run-local TARBALL=<tarball-name>` - Build and run SageMaker Code Editor locally on port 8888 using specified tarball
- `make clean` - Clean build artifacts and act temporary files

Example: `make run-local TARBALL=code-editor1.8.0b5.tar.gz`
=======
## Test Execution
Follow the previous steps to patch and build the project.

Use the `./scripts/test.sh` script for testing.

```
Usage: test.sh --website='<WEBSITE-URL>' [OPTIONS]

Required:
    --website='<WEBSITE-URL>'     URL of the Code Editor instance to test.

Options:
    -u|--unit-test                Run OSS unit tests.
    -i|--integ-test               Run OSS integration tests.
    -s|--style-check              Run OSS style check.
    -c|--cypress-integ-test       Run Code Editor UI tests.
    -l|--local                    Run Code Editor UI tests against a local instance (requires -c).
    -n|--no-patches               Skip automatic patching of OSS.
    -h|--help                     Show this help message and exit.
```
***Note***: make sure you have the `'`quotes`'` around the website url.

### Example
From the `sage-maker-code-editor` directory, run the following command in your terminal:

```shell
sh ./scripts/test.sh --website='http://localhost:9090' -uicl
```
This will run the OSS unit and integration tests, and the Cypress integration tests for a local Code Editor instance at `localhost:9090`. 
>>>>>>> 0e834c9c (add default automatic patching)

## Troubleshooting and Feedback

For any issues that customers would like to report, please route to the `amazon-sagemaker-feedback` repository: https://github.com/aws/amazon-sagemaker-feedback

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the LICENSE file.
