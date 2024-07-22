# Integration Test
## Install dependencies
Make sure to run the following commands to install dependencies:
```bash
yarn --cwd test/integ install
```
## Apply Patches
Make sure you have applied the patches you want and built the project. `install.sh` will apply all the patches.

1. Run `sh .scripts/install.sh`
2. Run `yarn watch` from within the `vscode` folder

## Running Cypress Integration Tests
The following commands are expected to be run from within the `integ` directory.

Running tests against local/non-Studio instance of Code Editor:
```bash
yarn cypress run --config-file cypress.local.config.ts --env WEBSITE=<link-to-code-editor-instance>
```

Running tests against Studio instance of Code Editor:
```bash
yarn cypress run --config-file cypress.hosted.config.ts --env WEBSITE=<link-to-code-editor-instance>
```
See [Cypress docs](https://docs.cypress.io/guides/guides/command-line) for more information.

## Adding Tests
To add tests for a new feature, create a new spec file in the `core` or `added-features` directories. Then add the filename to the spec pattern in the corresponding Cypress config file (`cypress.<local/hosted>.config.ts`).

`cypress.hosted.config.ts` includes additional tests for SageMaker features that must be run on a Code Editor instance in SageMaker Studio.

**Note**: The order of the specs in the spec pattern ***does*** matter