import 'cypress-wait-until';
import { BACKGROUND, DIALOG_BOX, GENERIC_BUTTON } from './constants';

export const DEBUG: boolean = Cypress.env('DEBUG');
export const RUN_LOCAL: boolean = Cypress.env('RUN_LOCAL');
export const WEBSITE: string = Cypress.env('WEBSITE');

let BASE_PATH: string = '';

/**
 * Visits the website specified by the WEBSITE constant and performs initial setup.
 *
 * This function is typically used at the beginning of a test suite or test case to navigate
 * to the website under test and ensure it has loaded completely before executing further tests
 * or actions.
 *
 * If the RUN_LOCAL flag is set to true, it will call the closeSignInDialog function to close
 * any sign-in dialog or modal that may appear when running the tests locally.
 *
 * After visiting the website, the function waits for 10 seconds to allow the website to fully
 * load before proceeding.
 */
export function visitOSS() {
	cy.visit(WEBSITE);

	if (RUN_LOCAL) {
		closeSignInDialog();
	}

        cy.wait(10_000);
}


/**
 * Opens a folder in the Visual Studio Code (VSCode) editor.
 *
 * @param {Set<string>} openedDirectories - A set containing the absolute paths of directories that have been previously opened. This is used to determine whether the "Trust Authors" dialog needs to be clicked.
 * @param {string} [path=' '] - The relative path of the folder to open. Defaults to an empty string.
 * @param {boolean} [useQuickInput=false] - Whether to use the quick input method to open the folder or the UI method. Defaults to false.
 *
 * This function opens a folder in the VSCode editor by either using the quick input method or the UI method (clicking the "Open Folder" button in the Explorer panel). It handles various scenarios, such as waiting for the "Open Folder" button to appear, typing the folder path, and clicking the "Trust Authors" dialog if the folder has not been opened before.
 *
 * If the `useQuickInput` parameter is true, the function uses the quick input method to open the folder. Otherwise, it uses the UI method by clicking the "Open Folder" button in the Explorer panel.
 *
 * The function keeps track of the opened directories in the `openedDirectories` set. If a directory has been opened before, the "Trust Authors" dialog will not appear again.
 *
 * If the `RUN_LOCAL` flag is true, the function also calls the `closeSignInDialog` function after opening the folder.
 *
 * Note: This function assumes that the Cypress testing framework is being used and relies on Cypress commands and utilities.
 */
export function openFolder(openedDirectories: Set<string>, path: string = ' ', useQuickInput: boolean = false) {
	const openFolderButton = '[class="monaco-button monaco-text-button"]';
	const openFolderInputBox = '[class="quick-input-widget show-file-icons"]';
	const explorerTab = 'div[class="welcome-view-content"]';

	if (useQuickInput) {
		if (DEBUG) {
			cy.log('Opening folder using quick input');
		}
		execVSCodeQuickInput('>Open Folder');
	} else {
		if (DEBUG) {
			cy.log('Opening folder using UI');
		}

		// Open the "Explorer" tab
		cy.get(BACKGROUND).type('{meta+shift+e}');

		if (DEBUG) {
			cy.log('Clicking \'Open Folder\' button');
		}

		// Wait until there are two buttons in the explorer panel
		cy.waitUntil(() => 
			cy.get(explorerTab)
				.find(openFolderButton)
				.then($elements => $elements.length === 2)
			, { 
				timeout: 30_000, 
				interval: 500,
				errorMsg: 'Timed out waiting for two elements to appear'
			}
		)

		// Click the "Open Folder" Button
		cy.get(explorerTab)
			.should('exist')
			.find(openFolderButton)
			.should('have.length', 2, {timeout: 30_000})
			.eq(0)
			.click();

		cy.wait(2000);
	}

	// Wait until the initial path is correct
        if (BASE_PATH == '') {
                cy.wait(10_000);
                cy.get(openFolderInputBox)
                        .should('exist')
                        .find('[class="input"]')
                        .eq(0)
                        .invoke('val')
                        .then((text: string) => {
                                BASE_PATH = text;
                        });
        }

	cy.get(openFolderInputBox)
		.should('exist')
		.find('[class="input"]')
		.eq(0)
		.should(($input) => {
			const inputValue = $input.val();
                        expect(inputValue).to.equal(BASE_PATH);
		})

	let absoluteFilePath: string = "";

	if (DEBUG) {
		cy.log('Setting folder path');
	}

	// Type the file path into the input box
	cy.get(openFolderInputBox)
		.should('exist')
		.find('[class="input"]')
		.eq(0)
		.type(path)
		.wait(1000);

	// Add the path to the set of visited paths
	cy.get(openFolderInputBox)
		.should('exist')
		.find('[class="input"]')
		.eq(0)
		.invoke('val')
		.then((text: string) => {
			cy.log(`ABSOLUTE FILE PATH: ${text}`)
			absoluteFilePath = text;
		});

	// Press enter to finish typing the path
	cy.get(openFolderInputBox)
		.should('exist')
		.find('[class="input"]')
		.eq(0)
		.type('{enter}');

	// Verify the "Open Folder" button is no longer there
	cy.get(openFolderButton)
		.should('not.exist');

	const checkTrustAuthors = !openedDirectories.has(absoluteFilePath);
	openedDirectories.add(absoluteFilePath);
	
	// If this directory has already been opened, the "Trust Authors" dialog won't show up
	if (!checkTrustAuthors) {
		cy.log('Have already opened this directory. No need to click \"Trust Authors');
		return
	} else {
		cy.log('Have not previously opened this directory. Need to click \"Trust Authors');
	}

	const dialogMessageBox = '[class="dialog-message-text"]';
	const yesTrustAuthors = '[class="monaco-button monaco-text-button"][title="Yes, I trust the authors"]';

	// Function to check if dialog box exists and is visible
	const isDialogVisible = () => {
		return cy.get('body').then($body => {
			const dialog = $body.find(DIALOG_BOX);
			if (dialog.length > 0 && dialog.is(':visible')) {
                                const messageBox = dialog.find(dialogMessageBox);
                                return messageBox.length > 0 && 
                                       messageBox.is(':visible') && 
                                       messageBox.text().includes('Do you trust the authors of the files in this folder?');
                        } 
                        return false;
		});
	};

        cy.wait(3_000);

	// Click to close the "Trust Authors" dialog box
	cy.get(DIALOG_BOX, {timeout: 30_000})
		.then((val) => {
			if (val.length > 0) {
				cy.get(DIALOG_BOX)
					.should('be.visible')
					.within(() => {
						cy.get(dialogMessageBox)
							.should('exist')
							.and('be.visible')
							.and('have.text', 'Do you trust the authors of the files in this folder?');
						cy.get(yesTrustAuthors)
							.should('exist')
							.and('be.visible')
							.click();
						cy.wait(1_000);
					});
			} else {
			cy.log("Dialog Box doesn't exist")
			}
		});

	// Wait for the dialog box to disappear or confirm it's not there
	cy.waitUntil(() => 
		isDialogVisible().then(visible => !visible)
	, { 
		timeout: 30000, 
		interval: 500,
		errorMsg: 'Timed out waiting for the dialog box to disappear'
	});

	if (RUN_LOCAL) {
		closeSignInDialog();
	}
}


export function closeSignInDialog() {
        const dialogMessageText = 'div[id="monaco-dialog-message-text"][class="dialog-message-text"]';
	const okButton = GENERIC_BUTTON;
	
	cy.get(DIALOG_BOX, {timeout: 30_000}).then((val) => {
		if (val.length > 0) {
                        cy.get(DIALOG_BOX).find(dialogMessageText)
                                .should('exist')
                                .should('have.text', 'Please sign in again');
			cy.log('Dialog Box exists. Clicking OK to close dialog box');
                        cy.wait(3_000);                        
			cy.get(DIALOG_BOX).find(okButton).click();
                        cy.wait(3_000);
		}
	});
}

export function createFile(filename: string) {
	const inputBar = execVSCodeQuickInput(`>Create: New File`);

	cy.get(inputBar)
		.wait(500)
		.type(filename);

	cy.get(inputBar)
		.wait(500)
		.type('{enter}')
		.wait(500);

	cy.get(inputBar)
		.type('{enter}');
}


export function execVSCodeQuickInput(command: string) {
        const inputBar = '[placeholder="Search files by name (append : to go to line or @ to go to symbol)"]';

	cy.get(BACKGROUND).should('exist').type("{ctrl+shift+p}");

	cy.get(inputBar)
		.should('exist')
		.and('be.visible')
		.type(`${command}{enter}`);

	return inputBar
}

export function typeInTerminal(command: string) {
	const TERMINAL = '[class="xterm-link-layer"]'

	cy.get(BACKGROUND)
		.should('exist')
		.type("{ctrl+shift+`}");

        cy.get('span[class*="codicon codicon-terminal"]', {timeout: 15_000});

        cy.wait(3_000);

	cy.get(TERMINAL, {timeout: 15_000})
		.should('exist')
                .eq(-1)
		.type(`${command}{enter}`);
}
