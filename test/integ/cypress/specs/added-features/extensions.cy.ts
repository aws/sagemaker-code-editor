import { typeInTerminal, execVSCodeQuickInput } from "../../support/commands";

describe('Extensions', () => {
  
	it('extensions can be installed via terminal', () => {
		const emrInstallCommand: string = 'sagemaker-code-editor --install-extension AmazonEMR.emr-tools --extensions-dir /opt/amazon/sagemaker/sagemaker-code-editor-server-data/extensions';
		
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