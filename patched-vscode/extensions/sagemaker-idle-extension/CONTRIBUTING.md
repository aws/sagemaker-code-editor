# Contributing to the Sagemaker Idle Extension
This guide explains how to make changes to this extension and test them.
## How to Make Changes
Changes to the sagemaker-idle-extension are managed by creating patches using the Quilt tool. Follow these steps:
1. Create a new patch: 
```
quilt new sagemaker-idle-extension-v<n>.patch # Replace <n> with the next version number
```
2. Make changes and add file 
```
quilt add sagemaker-idle-extension-v<n>.patch
```
3. Refresh the patch to include your changes:
```
quilt refresh
```
4. Update the changes in the patched-vsode folder 
5. Commit your changes and submit a pull request from your personal fork.

## How to Test 
1. Launch the Extension with Code Editor in local environment: 
    1. Install Prerequisite tools described [here](https://web.archive.org/web/20231012223533/https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites)  for your operating system.
    2. Run sh ./scripts/install.sh
    3. Run yarn watch from within the vscode folder
    4. Open a new terminal and run ./vscode/scripts/code-server.sh --launch

2. Perform user activity such as file changes, cursor editor movements, and terminal activity 
3. Verify `lastActiveTimestamp` is updated in the `.sagemaker-last-active-timestamp` file. 
4. Verify that the `/api/idle` endpoint returns the same `lastActiveTimestamp. 

### Test Cases
1. File change Detectcion 
    - Modify a file and ensure the timestamp updates.
	- Delete a file and verify the timestamp updates.
2. Text Editor Movement 
   - Move the text cursor within a file and check for timestamp updates.
	- Switch between files and verify updates.
3. Terminal Activity 
   - Open a new terminal, run a command, and ensure the timestamp updates.
	- Close the terminal and verify updates.
