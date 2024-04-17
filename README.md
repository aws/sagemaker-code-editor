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
- runs `./scripts/copy-resource.sh` that will copy patched version of code - oss from `./vscode` into `./patched-vscode` folder along with icon(s) and svg(s) from `./resources` folder
- runs `yarn install` and downloads built in extensions on patched submodule

## Troubleshooting and Feedback

For any issues that customers would like to report, please route to the `amazon-sagemaker-feedback` repository: https://github.com/aws/amazon-sagemaker-feedback

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the LICENSE file.