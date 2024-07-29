import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let idleFilePath: string
let terminalActivityInterval: NodeJS.Timeout | undefined
const LOG_PREFIX = "[sagemaker-idle-extension]"
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
		console.log(`${LOG_PREFIX} Unable to determine the home directory.`);
		return;
	}
	idleFilePath = path.join(homeDirectory, ".sagemaker-last-active-timestamp");
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
 * 
 * The /dev/pts directory is used in Unix-like operating systems to represent pseudo-terminal (PTY) devices.
 * Each active terminal session is assigned a PTY device. These devices are represented as files within the /dev/pts directory. 
 * When a terminal session has activity, such as when a user inputs commands or output is written to the terminal, 
 * the modification time (mtime) of the corresponding PTY device file is updated. By monitoring the modification 
 * times of the files in the /dev/pts directory, we can detect terminal activity.
 * 
 * If activity is detected (i.e., if any PTY device file was modified within the CHECK_INTERVAL), this function
 * updates the last activity timestamp.
 */
const checkTerminalActivity = () => {
	fs.readdir("/dev/pts", (err, files) => {
		if (err) {
			console.error(`${LOG_PREFIX} Error reading /dev/pts directory:`, err);
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
				console.error(`${LOG_PREFIX}}Error reading file stats:`, error);
				return false;
			}
		});

		if (activityDetected) {
			updateLastActivityTimestamp();
		}
	});
};

/**
 * Updates the last activity timestamp by writing the current timestamp to the idle file.
 */
function updateLastActivityTimestamp() {
	const timestamp = new Date().toISOString();
	fs.writeFileSync(idleFilePath, timestamp);
}