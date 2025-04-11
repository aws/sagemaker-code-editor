import * as process from "process";
import * as vscode from 'vscode';

import {
	ExtensionInfo,
	IMAGE_EXTENSIONS_DIR,
	LOG_PREFIX,
	PERSISTENT_VOLUME_EXTENSIONS_DIR,
} from "./constants"

import { 
	getExtensionsFromDirectory, 
	getInstalledExtensions, 
	installExtension, 
	refreshExtensionsMetadata } from "./utils"

export async function activate() {

	// this extension will only activate within a sagemaker app
	const isSageMakerApp = !!process.env?.SAGEMAKER_APP_TYPE_LOWERCASE;
	if (!isSageMakerApp) {
		return;
	}

	// get installed extensions. this could be different from pvExtensions b/c vscode sometimes doesn't delete the assets
	// for an old extension when uninstalling or changing versions
	const installedExtensions = new Set(await getInstalledExtensions());
	console.log(`${LOG_PREFIX} Found installed extensions: `, Array.from(installedExtensions));

	const prePackagedExtensions: ExtensionInfo[] = await getExtensionsFromDirectory(IMAGE_EXTENSIONS_DIR);
	const prePackagedExtensionsById: Record<string, ExtensionInfo> = {};
	prePackagedExtensions.forEach(extension => {
		prePackagedExtensionsById[extension.identifier] = extension;
	});

	console.log(`${LOG_PREFIX} Found pre-packaged extensions: `, prePackagedExtensions);

	const pvExtensions = await getExtensionsFromDirectory(PERSISTENT_VOLUME_EXTENSIONS_DIR);
	const pvExtensionsByName: Record<string, ExtensionInfo> = {};
	const pvExtensionsById: Record<string, ExtensionInfo> = {};
	pvExtensions.forEach(extension => {
		if (installedExtensions.has(extension.identifier)) {  // only index extensions that are installed
			pvExtensionsByName[extension.name] = extension;
			pvExtensionsById[extension.identifier] = extension;
		}
	});
	console.log(`${LOG_PREFIX} Found installed extensions in persistent volume: `, pvExtensionsById);

	// check each pre-packaged extension, record if it is not in installed extensions or version mismatch
	// store unsynced extensions as {identifier pre-packaged ext: currently installed version}
	const unsyncedExtensions: Record<string, string | null> = {}
	prePackagedExtensions.forEach(extension => {
		const id = extension.identifier;
		if (!(installedExtensions.has(id))){
			unsyncedExtensions[id] = pvExtensionsByName[extension.name]?.version ?? null;
		}
	});
	console.log(`${LOG_PREFIX} Unsynced extensions: `, unsyncedExtensions);

	if (Object.keys(unsyncedExtensions).length !== 0) {
		const selection = await vscode.window.showWarningMessage(
			'Warning: You have unsynchronized extensions from SageMaker Distribution \
			which could result in incompatibilities with Code Editor. Do you want to install them?',
			"Synchronize Extensions", "Dismiss");

		if (selection === "Synchronize Extensions") {
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = Object.keys(unsyncedExtensions).map(extensionId => ({
				label: extensionId,
				description: unsyncedExtensions[extensionId] ? `Currently installed version: ${unsyncedExtensions[extensionId]}` : undefined,
			}));
            quickPick.placeholder = 'Select extensions to install';
            quickPick.canSelectMany = true;
			quickPick.ignoreFocusOut = true;

            quickPick.onDidAccept(async () => {
                const selectedExtensions = quickPick.selectedItems.map(item => item.label);

				for (const extensionId of selectedExtensions) {
					const extensionName = prePackagedExtensionsById[extensionId].name;
					await installExtension(prePackagedExtensionsById[extensionId], pvExtensionsByName[extensionName]);
				}
				await refreshExtensionsMetadata();

                quickPick.hide();
				await vscode.window.showInformationMessage(
					'Extensions have been installed. \nWould you like to reload the window?',
					{ modal: true },
					'Reload'
				).then(selection => {
					if (selection === 'Reload') {
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
            });

            quickPick.show();
        }
	}
}