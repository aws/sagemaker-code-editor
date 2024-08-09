import * as vscode from 'vscode';
import { exec } from 'child_process';

const logPrefix = '[sagemaker-terminal-crash-mitigation]';

export function activate(_context: vscode.ExtensionContext) {
    let lastTerminal: vscode.Terminal | undefined;
    let lastProcessId: number | undefined;
    let lastOpenedTime: number | undefined;

     /**
     * Event listener for when a new terminal is opened.
     * Tracks the terminal's process ID and the time it was opened.
     */
    vscode.window.onDidOpenTerminal(async terminal => {
        lastTerminal = terminal;
        lastOpenedTime = Date.now();
        try {
            lastProcessId = await terminal.processId;
            console.log(`${logPrefix} Terminal opened: PID ${lastProcessId}, Time: ${lastOpenedTime}`);
        } catch (error) {
            console.error(`${logPrefix} Error getting process ID: ${error}`);
        }
    });

    /**
     * Event listener for when a terminal is closed.
     * Checks if the closed terminal is the one that was last opened,
     * and if it closed within 1 second. If no other terminals are active,
     * executes a command to kill all bash processes.
     */
    vscode.window.onDidCloseTerminal(async terminal => {
        if (lastTerminal && lastProcessId && lastOpenedTime) {
            try {
                const currentProcessId = await terminal.processId;
                console.log(`${logPrefix} Terminal closed: PID ${currentProcessId}`);

                if (currentProcessId === lastProcessId) {
                    const timeElapsed = Date.now() - lastOpenedTime;
                    console.log(`${logPrefix} Time elapsed since opening: ${timeElapsed}ms`);

                    if (timeElapsed < 1000) {
                        const remainingTerminals = vscode.window.terminals.length;
                        console.log(`${logPrefix} Number of remaining terminals: ${remainingTerminals}`);

                        if (remainingTerminals === 0) {
                            console.log(`${logPrefix} No other active terminals. Executing kill command.`);
                            execKillCommand();
                        } else {
                            console.log(`${logPrefix} There are other active terminals. Kill command not executed.`);
                        }
                    } else {
                        console.log(`${logPrefix} Terminal closed after 1 second. No action taken.`);
                    }
                } else {
                    console.log(`${logPrefix} Closed terminal PID does not match last opened terminal PID. No action taken.`);
                }
            } catch (error) {
                console.error(`${logPrefix} Error getting process ID on close: ${error}`);
            }
        }
    });
}


/**
 * Executes the command to kill all bash processes.
 * Fetches all bash process IDs and sends a `kill -9` signal to each one.
 */
function execKillCommand() {
    exec("ps -eo pid,comm | grep bash | awk '{print $1}'", (error, stdout, stderr) => {
        if (error) {
            console.error(`${logPrefix} Error fetching bash PIDs: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`${logPrefix} Error in command output: ${stderr}`);
            return;
        }

        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length === 0) {
            console.log(`${logPrefix} No bash processes found to kill.`);
            return;
        }

        pids.forEach(pid => {
            exec(`kill -9 ${pid}`, (killError, _killStdout, killStderr) => {
                if (killError) {
                    console.error(`${logPrefix} Error killing PID ${pid}: ${killError.message}`);
                    return;
                }
                if (killStderr) {
                    console.error(`${logPrefix} Error output while killing PID ${pid}: ${killStderr}`);
                    return;
                }
                console.log(`${logPrefix} Killed bash process with PID ${pid}.`);
            });
        });
    });
}

export function deactivate() {}
