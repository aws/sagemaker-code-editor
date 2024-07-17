Cypress.on('uncaught:exception', (err, runnable) => {
	// Handle the uncaught exception here
	// You can choose to fail the test, log the error, or take any other action
	// cy.log('Uncaught exception:', err);

	// Return false to prevent Cypress from failing the test
	return false;
});

// This can be used to get a generic button
const GENERIC_BUTTON = '[class="monaco-button monaco-text-button"]';
const BACKGROUND = '[class="titlebar-container"]';

const DEBUG: boolean = Cypress.env('DEBUG');
const RUN_LOCAL: boolean = Cypress.env('RUN_LOCAL');
const WEBSITE: string = Cypress.env('WEBSITE');

// Open the website
beforeEach(() => {
	cy.log(`DEBUG=${DEBUG}`);
	cy.log(`RUN_LOCAL=${RUN_LOCAL}`);
	cy.log(`WEBSITE=${WEBSITE}`);
	visitOSS();
});

describe('Opens Application', () => {

	it('Opens Code Editor application', () => {
	})
})

describe('Basic Functionality Tests', () => {
  
	it('opens folder', () => {
		// TODO: make directory from terminal
		// Open a folder
		openFolder('code/trash', false);
	})

	it('executes command in terminal', () => {
		// TODO: make directory from terminal
		// Open a folder
		openFolder('code/trash', false);

		// Run the `ls` command
		typeInTerminal('ls');
		cy.wait(3_000);

		// Close the terminal
		execVSCodeQuickInput(">Terminal: Detach Session");
		cy.wait(3_000);
	})
})

describe('Code Editor Feature Tests', () => {
  
	it('extensions can be installed via terminal', () => {
		const emrInstallCommand = 'sagemaker-code-editor --install-extension AmazonEMR.emr-tools --extensions-dir /opt/amazon/sagemaker/sagemaker-code-editor-server-data/extensions';
		
		// Run the command to install Amazon EMR extension
		typeInTerminal(emrInstallCommand);

		// Wait until the EMR extension icon is visible on the left sidebar
		cy.get('ul[role="tablist"]', {timeout: 15_000})
			.find('li')
			.filter(':has(a[aria-label="Amazon EMR"])', {timeout: 15_000})
			.should('exist')
			.and('be.visible');

		// Close the terminal
		execVSCodeQuickInput(">Terminal: Detach Session");
		cy.wait(3_000);
	})
})

// The set of directories the testing framework has opened so far
let openedDirectories: Set<string> = new Set();

function visitOSS() {
	cy.visit(WEBSITE);

	if (RUN_LOCAL) {
		closeSignInDialog();
	}
}

function closeSignInDialog() {
	const dialogBox = '[class="monaco-dialog-box"]';
	const okButton = GENERIC_BUTTON;
	
	// TODO: ensure the dialog box is actually the "please sign in" dialog
	// TODO: make dialogbox a global constant
	cy.get(dialogBox, {timeout: 30_000}).then((val) => {
		if (val.length > 0) {
			cy.log('Dialog Box exists');
			cy.log('Clicking OK to close dialog box');
			cy.get(dialogBox).find(okButton).click().wait(1000);
		}
	});
}

function openFolder(path: string = ' ', useQuickInput: boolean = false) {
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
	// TODO: try getting initial path from `pwd` or something. maybe @asolidu
	cy.get(openFolderInputBox)
		.should('exist')
		.find('[class="input"]')
		.eq(0)
		.should(($input) => {
			const inputValue = $input.val()
			expect(inputValue).to.be.oneOf(['/home/sagemaker-user/', '/Users/donocl/'])
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

	
	const dialogBox = '[class="monaco-dialog-box"]';
	const dialogMessageBox = '[class="dialog-message-text"]';
	const yesTrustAuthors = '[class="monaco-button monaco-text-button"][title="Yes, I trust the authors"]';

	// Function to check if dialog box exists and is visible
	const isDialogVisible = () => {
		return cy.get('body').then($body => {
			const $dialog = $body.find(dialogBox);
			return $dialog.length > 0 && $dialog.is(':visible');
		});
	};

	// Click to close the "Trust Authors" dialog box
	cy.get(dialogBox, {timeout: 30_000})
		.then((val) => {
			if (val.length > 0) {
				cy.get(dialogBox)
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

function createFile(filename: string) {
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

function execVSCodeQuickInput(command: string) {
	cy.get(BACKGROUND).should('exist').type("{ctrl+shift+p}")

	const inputBar = '[placeholder="Search files by name (append : to go to line or @ to go to symbol)"]';

	cy.get(inputBar)
		.should('exist')
		.and('be.visible')
		.type(`${command}{enter}`);

	return inputBar
}

function typeInTerminal(command: string) {
	const TERMINAL = '[class="xterm-link-layer"]'

	cy.get(BACKGROUND)
		.should('exist')
		.type("{ctrl+shift+`}");

	cy.wait(5_000);
	
	cy.get(TERMINAL, {timeout: 15_000})
		.should('exist')
		.type(`${command}{enter}`);
}