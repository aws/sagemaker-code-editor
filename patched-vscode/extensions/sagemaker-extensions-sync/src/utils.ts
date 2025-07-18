import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from 'vscode';
import { execFile } from "child_process";
import { promisify } from "util";

import {
	ExtensionInfo,
	LOG_PREFIX,
	PERSISTENT_VOLUME_EXTENSIONS_DIR,
} from "./constants"

export async function getExtensionsFromDirectory(directoryPath: string): Promise<ExtensionInfo[]> {
	const results: ExtensionInfo[] = [];
	try {
		const items = await fs.readdir(directoryPath);

		for (const item of items) {
			const itemPath = path.join(directoryPath, item);
			try {
				const stats = await fs.stat(itemPath);

				if (stats.isDirectory()) {
					const packageJsonPath = path.join(itemPath, "package.json");

					const packageData = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

					if (packageData.name && packageData.publisher && packageData.version) {
						results.push(new ExtensionInfo(
							packageData.name,
							packageData.publisher,
							packageData.version,
							itemPath,
						));
					}
				}
			} catch (error) {
				// fs.stat will break on dangling simlinks. Just skip to the next file
				console.error(`${LOG_PREFIX} Error reading package.json in ${itemPath}:`, error);
			}
		}
	} catch (error) {
		console.error(`${LOG_PREFIX} Error reading directory ${directoryPath}:`, error);
	}
	return results;
}

export async function getInstalledExtensions(): Promise<string[]> {
	const command = "sagemaker-code-editor";
	const args = ["--list-extensions", "--show-versions", "--extensions-dir", PERSISTENT_VOLUME_EXTENSIONS_DIR];

	const execFileAsync = promisify(execFile);
	try {
		const { stdout, stderr } = await execFileAsync(command, args);
		if (stderr) {
			throw new Error("stderr");
		}
		return stdout.split("\n").filter(line => line.trim() !== "");
	} catch (error) {
		console.error(`${LOG_PREFIX} Error getting list of installed extensions:`, error);
		throw error;
	}
}

export async function refreshExtensionsMetadata(): Promise<void> {
	const metaDataFile = path.join(PERSISTENT_VOLUME_EXTENSIONS_DIR, "extensions.json");
	try {
		await fs.unlink(metaDataFile);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			console.error(`${LOG_PREFIX} Error removing metadata file:`, error);
		}
	}
}

export async function installExtension(
	prePackagedExtensionInfo: ExtensionInfo, installedExtensionInfo?: ExtensionInfo | undefined
): Promise<void> {
	if (installedExtensionInfo) {
		console.log(`${LOG_PREFIX} Upgrading extension from ${installedExtensionInfo.identifier} to ${prePackagedExtensionInfo.identifier}`);
	} else {
		console.log(`${LOG_PREFIX} Installing extension ${prePackagedExtensionInfo.identifier}`);
	}
	try {
		if (!prePackagedExtensionInfo.path) {
			throw new Error(`Extension path missing for ${prePackagedExtensionInfo.identifier}`);
		}

		const targetPath = path.join(PERSISTENT_VOLUME_EXTENSIONS_DIR, path.basename(prePackagedExtensionInfo.path));

		// Remove existing symlink or directory if it exists
		try {
			console.log(`${LOG_PREFIX} Removing existing folder ${targetPath}`);
			await fs.unlink(targetPath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.error(`${LOG_PREFIX} Error removing existing extension:`, error);
				throw error;
			}
			// if file already doesn't exist then keep going
		}

		// Create new symlink
		try {
			console.log(`${LOG_PREFIX} Adding extension to persistent volume directory`);
			await fs.symlink(prePackagedExtensionInfo.path, targetPath, 'dir');
		} catch (error) {
			console.error(`${LOG_PREFIX} Error adding extension to persistent volume directory:`, error);
			throw error;
		}

		// Handle .obsolete file
		const OBSOLETE_FILE = path.join(PERSISTENT_VOLUME_EXTENSIONS_DIR, '.obsolete');
		let obsoleteData: Record<string, boolean> = {};

		try {
			const obsoleteContent = await fs.readFile(OBSOLETE_FILE, 'utf-8');
			console.log(`${LOG_PREFIX} .obsolete file found`);
			obsoleteData = JSON.parse(obsoleteContent);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				console.log(`${LOG_PREFIX} .obsolete file not found. Creating a new one.`);
			} else {
				console.warn(`${LOG_PREFIX} Error reading .obsolete file:`, error);
				// Backup malformed file
				const backupPath = `${OBSOLETE_FILE}.bak`;
				await fs.rename(OBSOLETE_FILE, backupPath);
				console.log(`${LOG_PREFIX} Backed up malformed .obsolete file to ${backupPath}`);
			}
		}

		if (installedExtensionInfo?.path) {
			const obsoleteBasename = path.basename(installedExtensionInfo.path);
			obsoleteData[obsoleteBasename] = true;
		}
		const obsoleteBasenamePrepackaged = path.basename(prePackagedExtensionInfo.path);
		obsoleteData[obsoleteBasenamePrepackaged] = false;

		try {
			console.log(`${LOG_PREFIX} Writing to .obsolete file.`);
			await fs.writeFile(OBSOLETE_FILE, JSON.stringify(obsoleteData, null, 2));
		} catch (error) {
			console.error(`${LOG_PREFIX} Error writing .obsolete file:`, error);
			throw error;
		}

		console.log(`${LOG_PREFIX} Installed ${prePackagedExtensionInfo.identifier}`);
	} catch (error) {
		vscode.window.showErrorMessage(`Could not install extension ${prePackagedExtensionInfo.identifier}`);
		console.error(`${LOG_PREFIX} ${error}`);
	}
}