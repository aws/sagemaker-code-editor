import * as vscode from 'vscode';

const SERVICE_NAME_ENV_KEY = 'SERVICE_NAME';
const SERVICE_NAME_ENV_VALUE = 'SageMakerUnifiedStudio';
const DEFAULT_THEME = 'Default Dark Modern';

let outputChannel: vscode.OutputChannel;

export function activate() {
    // Check if in SageMaker Unified Studio
    const envValue = process.env[SERVICE_NAME_ENV_KEY];
    if (!envValue || envValue !== SERVICE_NAME_ENV_VALUE) {
        return;
    }

    const config = vscode.workspace.getConfiguration();
    const themeConfig = config.inspect('workbench.colorTheme');
    outputChannel = vscode.window.createOutputChannel('SageMaker UI Dark Theme');

    outputChannel.appendLine(`Current theme configuration: ${JSON.stringify(themeConfig, null, 2)}`);

    // Check if theme is only set at default level
    if (themeConfig?.globalValue === undefined &&
        themeConfig?.workspaceValue === undefined &&
        themeConfig?.workspaceFolderValue === undefined) {

        outputChannel.appendLine('Theme only set at default level, applying theme update');

        // Update the configuration
        Promise.resolve(
            config.update('workbench.colorTheme', DEFAULT_THEME, vscode.ConfigurationTarget.Global)
                .then(() => {
                    outputChannel.appendLine(`Theme configuration updated to ${DEFAULT_THEME}`);
                    // Reload to apply theme
                    return vscode.commands.executeCommand('workbench.action.reloadWindow');
                })
                .then(() => outputChannel.appendLine('Theme applied successfully'))
        )
        .catch((error) => {
            outputChannel.appendLine(`Failed to apply theme: ${error}`);
        });
    } else {
        outputChannel.appendLine('Theme already configured in user or workspace settings, not overriding');
    }
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
