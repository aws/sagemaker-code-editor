import { openedDirectories } from "../../support/e2e";
import { openFolder, typeInTerminal, execVSCodeQuickInput } from "../../support/commands";

describe('Terminal', () => {
    it('executes command in terminal', () => {
		// TODO: make directory from terminal
		// Open a folder
		openFolder(openedDirectories, 'code/trash', false);

		// Run the `ls` command
		typeInTerminal('ls');
		cy.wait(3_000);

		// Close the terminal
		execVSCodeQuickInput(">Terminal: Detach Session");
		cy.wait(3_000);
	})
})