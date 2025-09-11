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

## Make Commands

Available make targets for building and testing:

### 1. When making local changes to iterate faster where tarball generation is not required [each run takes 10-20 mins]
- `make run-local` - Build and run SageMaker Code Editor locally from source and does not require a TARBALL; this process runs a watcher so changes are automatically picked from local workspace
- `make clean-vscode` - Cleans node_modules and out files

### 2. Once local changes are tested; follow this process to generate minified tarball [each run takes ~40 mins to build] 
- `make build-cache` - Build SageMaker Code Editor with multi-stage npm cache; Run once and layer gets cached with node_modules
- `make build` - Build SageMaker Code Editor and output artifacts (tarball) to ./artifacts
- `make run-local TARBALL=<tarball-name>` - Build and run SageMaker Code Editor locally on port 8888 using specified tarball from previos step. Example: `make run-local TARBALL=sagemaker-code-editor-1.101.2.tar.gz`

### 3. This process is used to test and simulate github workflows locally [each run takes ~60 mins] 
- `make run-github` - Run complete GitHub Actions workflow locally using act

### 4. Cleanup
- `make clean` - Cleans node_modules, out files, and act temporary files

## Troubleshooting and Feedback

For any issues that customers would like to report, please route to the `amazon-sagemaker-feedback` repository: https://github.com/aws/amazon-sagemaker-feedback

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the LICENSE file.
