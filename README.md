## SageMaker Code Editor

This is the repo for `sagemaker-code-editor`.

To properly patch, please follow instructions below:

* Use `quilt` to apply patches in sequence using `quilt push -a` from the root directory. 
    - Install quilt in mac - `brew install quilt`
* Copy resources with the shell script (also in the root directory) by running these commands:
    - `chmod +x copy-resources.sh`
    - `./copy-resources.sh`

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.