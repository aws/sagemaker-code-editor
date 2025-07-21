import * as vscode from 'vscode';
import * as fs from 'fs';
import { POST_START_UP_STATUS_FILE, SERVICE_NAME_ENV_KEY, SERVICE_NAME_ENV_VALUE } from './constant';
import { StatusFile } from './types';
import * as chokidar from 'chokidar';

// Simple method to check if user has seen a notification
function hasUserSeen(context: vscode.ExtensionContext, notificationId: string): boolean {
  return context.globalState.get(`notification_seen_${notificationId}`) === true;
}

// Simple method to mark notification as seen
function markAsSeen(context: vscode.ExtensionContext, notificationId: string): void {
  context.globalState.update(`notification_seen_${notificationId}`, true);
}

let previousStatus: string | undefined;
let watcher: chokidar.FSWatcher;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    // Check if in SageMaker Unified Studio
    const envValue = process.env[SERVICE_NAME_ENV_KEY];

    if (!envValue || envValue !== SERVICE_NAME_ENV_VALUE) {
        return;
    }

    outputChannel = vscode.window.createOutputChannel('SageMaker Unified Studio Post Startup Notifications');
    
    // Show Q CLI notification if user hasn't seen it before
    showQCliNotification(context);

    try {
        watcher = chokidar.watch(POST_START_UP_STATUS_FILE, {
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        watcher.on('add', (path) => {
            processStatusFile();
        }).on('change', (path) => {
            processStatusFile();
        }).on('unlink', (path) => {
            outputChannel.appendLine(`File ${path} has been removed`);
        });

    } catch (error: any) {
        outputChannel.appendLine(`Error setting up file watcher: ${error}`);
    }
}

function processStatusFile() {
    try {
        const content = fs.readFileSync(POST_START_UP_STATUS_FILE, 'utf8');
        const statusData: StatusFile = JSON.parse(content);

        // Only show message if status has changed
        if (statusData.status && statusData.status !== previousStatus) {
            previousStatus = statusData.status;

            if (statusData.message) {
                switch (statusData.status.toLowerCase()) {
                    case 'error':
                        vscode.window.showErrorMessage(statusData.message);
                        break;
                    case 'in-progress':
                    default:
                        vscode.window.showInformationMessage(statusData.message);
                }
            }
        }
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            outputChannel.appendLine(`Error processing status file: ${error.message}`);
        }
    }
};

// Show Q CLI notification if user hasn't seen it before
function showQCliNotification(context: vscode.ExtensionContext): void {
    const notificationId = 'smus_q_cli_notification';
    const message = 'The Amazon Q Command Line Interface (CLI) is installed. You can now access AI-powered assistance in your terminal.';
    const link = 'https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/q-actions.html';
    const linkLabel = 'Learn More';
    
    if (!hasUserSeen(context, notificationId)) {
        outputChannel.appendLine("User has not seen the notification")
        // Show notification with Learn More button
        vscode.window.showInformationMessage(
            message,
            { modal: false },
            { title: linkLabel, isCloseAffordance: false }
        ).then((selection) => {
            if (selection && selection.title === linkLabel) {
                vscode.env.openExternal(vscode.Uri.parse(link));
            }
            
            // Mark as seen regardless of which button was clicked
            markAsSeen(context, notificationId);
        });
    }
}

export function deactivate() {
    if (watcher) {
        watcher.close();
    }
    outputChannel.appendLine('Status monitor deactivated');
    if (outputChannel) {
        outputChannel.dispose();
    }
}