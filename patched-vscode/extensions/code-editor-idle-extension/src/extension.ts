import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let idleFilePath: string
let terminalActivityInterval: NodeJS.Timeout | undefined
const CHECK_INTERVAL = 60000; // 60 seconds interval

export function activate(context: vscode.ExtensionContext) {
	initializeIdleFilePath();
	registerEventListeners(context);
	startMonitoringTerminalActivity();
}

export function deactivate() {
	if(terminalActivityInterval) {
		clearInterval(terminalActivityInterval)
	}
}

/**
 * Initializes the file path where the idle timestamp will be stored.
 * It sets the path to a hidden file in the user's home directory.
 */
function initializeIdleFilePath() {
	const homeDirectory = process.env.HOME || process.env.USERPROFILE;
	if (!homeDirectory) {
		console.log("Unable to determine the home directory.");
		return;
	}
	idleFilePath = path.join(homeDirectory, ".code-editor-last-active-timestamp");
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
 * Starts monitoring terminal activity by setting an interval to check for activity in the /dev/pts directory.
 */
const startMonitoringTerminalActivity = () => {
	terminalActivityInterval = setInterval(checkTerminalActivity, CHECK_INTERVAL);
};


/**
 * Checks for terminal activity by reading the /dev/pts directory and comparing modification times of the files.
 * If activity is detected, it updates the last activity timestamp.
 */
const checkTerminalActivity = () => {
	fs.readdir("/dev/pts", (err, files) => {
		if (err) {
			console.error("Error reading /dev/pts directory:", err);
			return;
		}

		const now = Date.now();
		const activityDetected = files.some((file) => {
			const filePath = path.join("/dev/pts", file);
			try {
				const stats = fs.statSync(filePath);
				const mtime = new Date(stats.mtime).getTime();
				return now - mtime < CHECK_INTERVAL;
			} catch (error) {
				console.error("Error reading file stats:", error);
				return false;
			}
		});

		if (activityDetected) {
			updateLastActivityTimestamp();
		}
	});
};

/**
 * Updates the last activity timestamp by writing the current timestamp to the idle file and updating the status bar.
 */
function updateLastActivityTimestamp() {
	const timestamp = new Date().toISOString();
	fs.writeFileSync(idleFilePath, timestamp);
}