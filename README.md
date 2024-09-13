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

Usage:
```bash
Usage: install.sh [-t <VERSION>] [-v] [-h]

Otions:
  -t <VERSION>    Create a tarball with the specified version
  -v              Enable verbose output
  -h              Show this help message
```

## Local Setup

- Install Prerequisite tools described [here](https://web.archive.org/web/20240711074020/https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites) for your operating system.
- Run `sh ./scripts/install.sh`
- Run `yarn watch` from within the `vscode` folder
- Open a new terminal and run `./vscode/scripts/code-server.sh --launch`

## Test Execution
Follow the previous steps to patch and build the project.

Use the `./scripts/test.sh` script for testing.

```
Usage: test.sh [OPTIONS]

Options:
    -w '<WEBSITE-URL>'|--website='<WEBSITE_URL>'        URL of the Code Editor instance to test (default: http://localhost:9888).
    -u|--unit-test                                      Run OSS unit tests.
    -i|--integ-test                                     Run OSS integration tests.
    -s|--style-check                                    Run OSS style check.
    -c|--cypress-integ-test                             Run Code Editor UI tests.
    -l|--local                                          Run Code Editor UI tests against a local instance (requires -c).
    -n|--no-patches                                     Skip automatic patching of OSS.
    -h|--help                                           Show this help message and exit.
```
***Note***: make sure you have the `'`quotes`'` around the website url.

### Example
From the `sage-maker-code-editor` directory, run the following command in your terminal:

```shell
sh ./scripts/test.sh --website='http://localhost:9090' -uicl
```
This will run the OSS unit and integration tests, and the Cypress integration tests for a local Code Editor instance at `localhost:9090`. 

## Publishing Releases
To publish a new release using the GitHub Action, open a new branch the open a PR, the PR should be reviewed and manually approval from @aws-pangestu, @aws-navinns, or @aws-asolidu.
Once PR is approved, push a tag that starts with `v`, e.g. `v1.5.0`. This will trigger an Action to create a tarball and publish it in a release with the tag `v1.5.0`. Currently the Action will require. manually approval from @aws-pangestu, @aws-navinns, or @aws-asolidu.

### Future
We hope to extend this Action to also automatically update the CodeEditor feedstock repository.

## Troubleshooting and Feedback

For any issues that customers would like to report, please route to the `amazon-sagemaker-feedback` repository: https://github.com/aws/amazon-sagemaker-feedback

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the LICENSE file.
