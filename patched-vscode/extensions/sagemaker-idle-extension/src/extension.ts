import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let idleFilePath: string;

export function activate(context: vscode.ExtensionContext) {
	initializeIdleFilePath();
	registerEventListeners(context);
}

export function deactivate() {}

/**
 * Initializes the file path where the idle timestamp will be stored.
 * It sets the path to a hidden file in the /tmp/ directory.
 */
function initializeIdleFilePath() {
	const tmpDirectory = "/tmp/"; 
	idleFilePath = path.join(tmpDirectory, ".sagemaker-last-active-timestamp");

	// Set initial lastActivetimestamp
	updateLastActivityTimestamp();
}

/**
 * Registers event listeners to monitor user activity within the VSCode editor.
 * It listens to document changes, editor focus changes, text selection changes, and terminal events.
 * @param context - The context in which the extension is running.
 */
function registerEventListeners(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((_) => {
			updateLastActivityTimestamp();
		}),
		vscode.window.onDidChangeActiveTextEditor((_) => {
			updateLastActivityTimestamp();
		}),
		vscode.window.onDidChangeTextEditorSelection((_) => {
			updateLastActivityTimestamp();
		}),
		vscode.window.onDidOpenTerminal((_) => {
			updateLastActivityTimestamp();
		}),
		vscode.window.onDidCloseTerminal((_) => {
			updateLastActivityTimestamp();
		})
	);
}

/**
 * Updates the last activity timestamp by recording the current timestamp in the idle file and
 * refreshing the status bar. The timestamp should be in ISO 8601 format and set to the UTC timezone.
 */
function updateLastActivityTimestamp() {
	const timestamp = new Date().toISOString();
	fs.writeFileSync(idleFilePath, timestamp);
}