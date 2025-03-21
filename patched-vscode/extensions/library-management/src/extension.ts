// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';

let libMgmtStatusBar: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('webview.libmgmt', () => {

		try {
			const jsonFilePath = '/home/sagemaker-user/src/.libs.json';

			// Validate file existence
			if (!fs.existsSync(jsonFilePath)) {
			  throw new Error(`File not found: ${jsonFilePath}`);
			}
	  
			// Read and parse JSON file
			const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
			let configData;

			try {
			  configData = JSON.parse(jsonContent);
			} catch (error) {
			  throw new Error('Invalid JSON file format');
			}
	  
			// Create webview panel
			const panel = vscode.window.createWebviewPanel(
			  'webview',
			  '.libs.json',
			  vscode.ViewColumn.One,
			  {
				enableScripts: true,
				retainContextWhenHidden: true
			  }
			);

			panel.webview.onDidReceiveMessage(
				async message => {
				  switch (message.command) {
					case 'saveConfig':
					  try {
						console.log("Saving changes to file...");
						// Write to file
						fs.writeFileSync(
						  jsonFilePath,
						  JSON.stringify(message.data, null, 2),
						  'utf-8'
						);
		
						// Show success message
						vscode.window.showInformationMessage('Configuration saved successfully');
		
						// Update the configData variable
						configData = message.data;

						if(message.data.ApplyChangeToSpace) {
							try {
								const task = new vscode.Task(
									{ type: 'shell' },
									vscode.TaskScope.Workspace,
									'Script Execution',
									'Shell',
									new vscode.ShellExecution(`bash /etc/sagemaker-ui/libmgmt/install-lib.sh $HOME/src`)
								);
								task.presentationOptions = {
									reveal: vscode.TaskRevealKind.Never,
									echo: false,
									focus: false,
									panel: vscode.TaskPanelKind.Shared,
									clear: true,
									close: true
								};
							
								await vscode.tasks.executeTask(task);
								vscode.window.showInformationMessage('Script executed succesfully!');
							} catch (error) {
								vscode.window.showErrorMessage(`Failed to execute script: ${error}`);
							}

						}
						
					  } catch (error) {
						// Show error message
						vscode.window.showErrorMessage(
						  `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
						);
					  }
					  break;
				  }
				},
				undefined,
				context.subscriptions
			  );
	  
			// Get webview content
			panel.webview.html = getWebviewContent(panel.webview, context, configData);
	  
		  } catch (error) {
			vscode.window.showErrorMessage(
			  error instanceof Error ? error.message : 'Failed to load configuration'
			);
		  }
    }));

	libMgmtStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	libMgmtStatusBar.command = 'webview.libmgmt';
	libMgmtStatusBar.text = `$(library)`;
	libMgmtStatusBar.tooltip = 'Library Management';
	libMgmtStatusBar.show();

	context.subscriptions.push(libMgmtStatusBar);
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext, configData: any) {
	// Get path to React app build files
	const appPath = webview.asWebviewUri(
	  vscode.Uri.joinPath(context.extensionUri, 'web', 'dist', 'index.js')
	);
	
	console.log(appPath);

	let cssSrc = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "web", "dist", "index.css"));
	return `
	  <!DOCTYPE html>
        <html lang="en">
          <head>
            <link rel="stylesheet" href="${cssSrc}" />
			<script>
		        window.initialData = ${JSON.stringify(configData)};
      		</script>
			<style>
				body {
				background-color: var(--vscode-editor-background);
				color: var(--vscode-editor-foreground);
				font-family: var(--vscode-font-family);
				margin: 0;
				padding: 0;
				}

				:root {
				--font-family: var(--vscode-font-family);
				--font-size: var(--vscode-font-size);
				}

				* {
				box-sizing: border-box;
				}
			</style>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script src="${appPath}"></script>
          </body>
        </html>
	`;
}
  
export function deactivate() {}
