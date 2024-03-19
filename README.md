## SageMaker Code Editor

This is the repo for `sagemaker-code-editor`. For more information on Code Editor on SageMaker, please refer to: https://docs.aws.amazon.com/sagemaker/latest/dg/code-editor.html

The `patched-vscode` folder's only usage is to help reviewers review the patch changes. To ease reviewing patches (`.diff` files), whenever we raise a PR for adding/updating a patch, we will also apply the patches to this directory so that this folder's diff shows up in the PR.

Whenever we create a new branch with `vscode` pointing to a specific commit, this folder must be populated with the same contents as `vscode` at that particular commit.

## Patching Execution

To properly patch, please follow instructions below:

* After cloning the repo, run `git submodule init` and `git submodule update` to initialize the `vscode` submodule.
* Use `quilt` to apply patches in sequence using `quilt push -a` from the root directory. 
    - Install quilt on mac - `brew install quilt`
* Copy resources with the shell script (also in the root directory) by running these commands:
    - `chmod +x copy-resources.sh`
    - `./copy-resources.sh`

The above steps will result in changes being applied to the `vscode` folder.

## Troubleshooting and Feedback

For any issues that customers would like to report, please route to the `amazon-sagemaker-feedback` repository: https://github.com/aws/amazon-sagemaker-feedback

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the LICENSE file.