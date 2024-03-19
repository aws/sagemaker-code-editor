## SageMaker Code Editor

This is the repo for `sagemaker-code-editor`.

The `patched-vscode` folder's only usage is to help reviewers review the patch changes. To ease reviewing patches (`.diff` files), whenever we raise a PR for adding/updating a patch, we will also apply the patches to this directory so that this folder's diff shows up in the PR.

Whenever we create a new branch with `vscode` pointing to a specific commit, this folder must be populated with the same contents as `vscode` at that particular commit.

To properly patch, please follow instructions below:

* Copy resources with the shell script (also in the root directory) by running these commands:
    - `chmod +x copy-resources.sh`
    - `./copy-resources.sh`
* Use `quilt` to apply patches in sequence using `quilt push -a` from the root directory. 
    - Install quilt in mac - `brew install quilt`

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.