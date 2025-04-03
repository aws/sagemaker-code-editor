import 'cypress-wait-until';
import { BACKGROUND, DIALOG_BOX, GENERIC_BUTTON } from './constants';
import 'cypress-plugin-tab'

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
	const tickCheckBox = '.monaco-checkbox';

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

						cy.get(tickCheckBox).then($checkbox => {
								if ($checkbox.is(':visible')) {
								  cy.wrap($checkbox).click()
								}
							  });
							
						cy.get('.monaco-button').contains('Yes, I trust the authors').click();
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


function handleExistsDialog() {
	const alreadyExists = '.quick-input-widget:contains("already exists")';
	const inputWidget = '.quick-input-widget';

	return cy.get('body', { timeout: 20000 }).then($body => {
		if ($body.find(alreadyExists).length > 0) {
			cy.log("Found 'already exists' dialog");
			return cy.get(inputWidget)
				.contains('OK')
				.should('be.visible')
				.click();
		}
	});
}

export function openFilename(filename: string){
	const openFile = '>File: Open File';
	const inputFileName = '.quick-input-widget .input';
	const editor = '.monaco-editor';
	const file = 'test.py';
	const browserInterrupt = '.monaco-dialog-box:contains("browser interrupted")';

    cy.contains('.tab-label', file)
        .click({ force: true });

    // Verify the file is active
    cy.get('.monaco-editor')
        .should('be.visible');
}

export function createJupyterNotebook(filename: string) {
	// Close all files (open files cause errors)
    execVSCodeQuickInput('>View: Close All Editors');
    cy.wait(5000);

	// Handle "Do you want to save the changes" dialog if it appears
    cy.get('body').then($body => {
        if ($body.find('.monaco-dialog-modal-block').length > 0) {
            cy.get('.monaco-dialog-modal-block')
                .contains('Don\'t Save')
                .click();
            cy.wait(2000);
        }
    });

    // Create new Jupyter Notebook and wait until the file opens
    execVSCodeQuickInput('>Create: New Jupyter Notebook');
    cy.wait(5000);
    
    // Save the file using command palette
    execVSCodeQuickInput('>File: Save As');
    
    // Handle the save dialog
    cy.get('.quick-input-widget.show-file-icons', { timeout: 10000 })
        .should('be.visible')
        .find('.input')
        .should('be.visible')
        .and('not.be.disabled')
		.wait(3000)
        .type(filename, { delay: 300 });

    // Click OK when prompted "This file already exists, are you sure you want to overwrite?"
    cy.get('.quick-input-widget.show-file-icons')
        .find('a.monaco-button.monaco-text-button')
        .contains('OK')
        .should('be.visible')
        .click();

	// Wait for the dialogue box to appear
	cy.wait(4000);

	// Usage in main function
	cy.get('body', { timeout: 10000 }).then($body => {
		if ($body.find('.quick-input-widget:contains("already exists")').length > 0) {
			handleExistsDialog();
		}
	});
}

export function testGotoFunction(){
	const saveChanges = '.monaco-dialog-modal-block';
	const editor = '.monaco-editor';

	 // Wait for the editor to be fully loaded
	 cy.get(editor, { timeout: 10000 }).should('be.visible');

	 // Find and click on the 'print' command to set the cursor
	 cy.get('.view-line')
		 .contains('print')
		 .click({ force: true });
 
	 // Use VSCode command to open Go to Definition
	 execVSCodeQuickInput('>Go to Definition');
	 cy.wait(2000);

	 // Verify the definition is visible
	 cy.get(editor)
		.last()
		.should('contain', 'def print');
}

export function typeInFile(filename: string, command: string) {
	// Wait for file
    cy.wait(5000);

    // Type in file
    cy.get('textarea.inputarea', {timeout: 10000})
        .first()
        .click({ force: true })
		.wait(1000)
        .type(command, { force:true, delay: 300 });

    // Save and run
    execVSCodeQuickInput('>File: Save As');

	// Handle Save As dialog
    cy.get('.quick-input-widget', {timeout: 10000})
        .contains('Save As')
        .parent()
        .parent()
        .within(() => {
            cy.get('a.monaco-button.monaco-text-button')
                .contains('OK')
                .click({ force: true });
        });

	cy.get('.quick-input-widget', {timeout: 10000})
        .contains('test.py already exists')
        .parent()
        .parent()
        .within(() => {
            cy.get('a.monaco-button.monaco-text-button')
                .contains('OK')
                .click({ force: true });
        });

	cy.wait(6000);

}


export function createPythonFile(filename: string) {
	const fileURL = `/home/sagemaker-user/${filename}.py`;
	const workBench = '.monaco-workbench';
	const createPythonCommand = '>Python: New Python File';
	const editor = '.monaco-editor';
	const saveFile = '>Save As';
	const enterFileNameInputWidget = '[class="quick-input-widget show-file-icons"]';
	const okButton = '.monaco-button';
	const dialogBox = '.monaco-dialog-box';

    // Wait for VS Code to be ready
    cy.get(workBench).should('be.visible');

    // Execute New Python File command
    execVSCodeQuickInput(createPythonCommand);

    // Wait for the editor to be ready
    cy.get(editor).should('be.visible');

    // Execute Save As command
    execVSCodeQuickInput(saveFile);
    
    // Wait for and interact with the save dialog
    cy.get(enterFileNameInputWidget)
        .should('be.visible')
        .within(() => {
            cy.get('[class="input"]', {timeout:10000})
                .should('be.visible')
                .should('be.enabled')
				.wait(2000)
                .clear()
                .should('have.value', '')
                .type(fileURL, { delay: 200 })
                .should('have.value', fileURL)
				.wait(2000)
                .type('{enter}')
				.wait(2000);
        });

	cy.wait(5000);

    // Handle the overwrite confirmation dialog if it appears
	cy.get(okButton).contains('OK').click({ force: true });
	cy.get(dialogBox).should('not.exist');

    // Wait for the file to be saved and editor to update
    cy.get(editor)
        .should('be.visible')
        .find('.view-line')
        .should('exist');
}


export function runAndPrintOnFile(filename: string, pythonFile: string, testString: string) {
	const terminalCommand = `python3 ${pythonFile}.py > ${filename}.txt`;
	const openFile = '>Go to File';
	const inputFileName = '.quick-input-widget .input';
	const fileURL = `/home/sagemaker-user/${filename}.txt`;
	const pythonFileURL = `/home/sagemaker-user/${pythonFile}.py`;
	const editor = '.monaco-editor';

	openFilename(pythonFileURL);

    // Run Python command in terminal
    typeInTerminal(terminalCommand);
    cy.wait(5000);

    // Use Go to File command
    execVSCodeQuickInput(openFile);

	cy.wait(5000);
    
    // Type the full path to the file
    cy.get(inputFileName)
        .should('be.visible')
        .type(fileURL)
		.type('{enter}');

	cy.wait(5000);

    // Verify content in editor
    cy.get(editor)
        .should('be.visible')
		.should('contain.text', testString)
        .contains(testString);
	
}

export function typeAndExecuteInNotebook(command: string, filename: string) {
	const editor = '.notebook-editor';
	const selectKernelButton = '.kernel-label:contains("Select Kernel")';
	const kernelSelector = '.kernel-label';
	const monacoEditor = '.monaco-editor';
	const saveChanges = '.monaco-dialog-modal-block';

    cy.wait(5000);

    // Wait for notebook to load and be ready
    cy.get(editor, { timeout: 15000 })
        .should('be.visible');

	cy.wait(5000);

	cy.get('body').then($body => {
        if ($body.find(selectKernelButton).length > 0) {
            // Click kernel selector
            cy.get(kernelSelector)
                .contains('Select Kernel')
                .click();
			
            // Click "Python Environments"
            cy.contains('Python Environments')
                .should('be.visible')
                .click();

            // Select base Python environment
            cy.contains('conda (Python 3')
                .should('be.visible')
                .click();
			
			cy.wait(10000);
        }
    });

    // Handle the editor with the overlapping elements
    cy.get(monacoEditor)
        .first()
        .should('be.visible')
        .then($editor => {
            // Remove the overlapping view-line
            cy.wrap($editor)
                .find('.view-line')
                .invoke('css', 'pointer-events', 'none');

            // Now invoke the inputarea and type on it
            cy.wrap($editor)
                .find('.inputarea')
                .invoke('css', {
                    'position': 'relative',
                    'z-index': '9999',
                    'opacity': '1'
                })
                .should('be.visible')
                .click({ force: true })
                .type(command, {
                    delay: 200,
                    force: true
                });

			cy.wrap($editor)
				.type('{shift+enter}');
        });

	cy.wait(5000);

	cy.get(editor)
		.should('contain', 'hello');

	cy.wait(2000);

    // Close all files from the editor (all open files on the editor)
    execVSCodeQuickInput('>View: Close All Editors');
    cy.wait(5000);

	// Handle "Do you want to save the changes" dialog if it appears
	cy.get('body').then($body => {
        if ($body.find(saveChanges).length > 0) {
            cy.get(saveChanges)
                .contains('Don\'t Save')
                .click();
            cy.wait(2000);
        }
    });
}

export function verifyNumberOfCodeLines( pythonFile: string, codeInput: string){
	const openFile = '>Go to File';
	const inputFileName = '.quick-input-widget .input';
	const pythonFileURL = `/home/sagemaker-user/${pythonFile}.py`;
	const editor = '.monaco-editor';

	openFilename(pythonFileURL);


	cy.wait(5000);

    // Get initial number of lines
    cy.get('.monaco-editor .view-lines')
		.contains(codeInput)
		.should('be.visible')
        .then($editor => {
            const initialContent = $editor.text();
            // cy.log('Initial content:', initialContent);

			cy.get('.monaco-editor .inputarea.monaco-mouse-cursor-text')
                .type(':', { force: true })
                .wait(2000)
				.tab();

            // Press tab after 'def' to trigger recommendations
            // cy.get('body').type('\t', { force: true });
            
            cy.wait(20000); // Wait for recommendations to appear

            // Verify that there's more content than just 'def'
            cy.get(editor, {timeout: 10000})
			.should('not.have.text', `${codeInput}:`) 
			.then($newEditor => {
                const newContent = $newEditor.text();
                // cy.log('New content:', newContent);
                
                // Verify content is more than just 'def'
				expect(newContent.length, 'Content length has increased').to.be.greaterThan(initialContent.length);
				expect(newContent, 'Content has changed').to.not.equal(initialContent);
				expect(newContent, 'Content is not just input with colon').to.not.equal(`${codeInput}:`);

                // expect(newContent.length).to.be.greaterThan(initialContent.length);
                // expect(newContent).to.not.equal('def');
            });

			cy.wait(10000);
    });
}



// Extension

export function loadWorkspace(){
	cy.get('.monaco-workbench', { timeout: 30000 }).should('be.visible');
}

export function openExtensionPanel(){
	cy.get('body').type('{shift}{cmd}x');
    cy.wait(3000);
}

export function manageGitHubExtension(extensionName: string) {
    // Wait for workspace to load
    loadWorkspace();
    // Open Extensions panel
    openExtensionPanel();

    //   Search for GitHub Pull Requests extension
      cy.get('.extensions-search-container')
        .find('textarea[aria-label="Search Extensions in Marketplace"]')
        .type('GitHub Pull Requests{enter}', { force: true });
      
      cy.wait(5000);
  
    //   Find and click on the GitHub Pull Requests extension
      cy.get('.monaco-list-rows')
        .contains('.extension-list-item', 'GitHub Pull Requests')
        .should('be.visible')
        .click();
  
      // Check for install button in actions-status-container
      cy.get('.extension-editor .header .actions-status-container')
        .then($container => {
          const isInstalled = $container.find('Uninstall').length > 0;

          if (isInstalled) {
              cy.log('Extension is installed - proceeding with uninstall');
              // Find and click Uninstall
              cy.get('.actions-status-container')
                .find('.action-item.action-dropdown-item:not(.disabled)')
                .contains('Uninstall')
                .click({ force: true });
          } 
          else {
              cy.log('Extension needs to be installed');
              // Click Install
              cy.get('.actions-status-container')
                  .find('.action-item.action-dropdown-item:not(.disabled)')
                  .find('.action-label.extension-action.label.prominent.install')
                  .first() // Select only the first matching element
                  .click({ force: true });
            
              // Wait for Installing state
              cy.get('.actions-status-container')
              .find('.action-label.codicon.disabled.extension-action.label.install.installing')
              .should('be.visible');
              
              cy.wait(15000);

              // Wait for Installing to complete (button should disappear)
              cy.get('.actions-status-container')
              .find('.action-label.codicon.disabled.extension-action.label.install.installing')
              .should('not.exist');

              cy.wait(2000);
          }
  
          // Handle reload window
          cy.contains('Reload Window', {timeout: 10000})
            .should('be.visible')
            .click({ force: true });
  
          // Wait for workspace to reload
          cy.get('.monaco-workbench', { timeout: 30000 }).should('be.visible');
          
          if (!isInstalled) {
            // If we just installed, we need to uninstall
            cy.get('body').type('{shift}{cmd}x');
            cy.wait(3000);
  
            // Search again
            cy.get('.extensions-search-container')
              .find('textarea[aria-label="Search Extensions in Marketplace"]')
              .type('GitHub Pull Requests{enter}', { force: true });
            
            // Click on extension again
            cy.get('.monaco-list-rows')
              .contains('.extension-list-item', 'GitHub Pull Requests')
              .should('be.visible')
              .click();
  
            // Find and click Uninstall
            cy.get('.actions-status-container')
              .find('.action-item.action-dropdown-item:not(.disabled)')
              .contains('Uninstall')
              .click({ force: true });
  
            // Handle final reload
            cy.contains('Reload Window')
              .should('be.visible')
              .click({ force: true });
          }
        });
  
      // Wait for final reload to complete
      cy.get('.monaco-workbench', { timeout: 30000 }).should('be.visible');
}
