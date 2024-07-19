import { openedDirectories } from "../../support/e2e";
import { openFolder, typeInTerminal, execVSCodeQuickInput } from "../../support/commands";

describe('Terminal', () => {
        it('executes command in terminal', () => {
        
		// Run the `ls` command
		typeInTerminal('ls');
		cy.wait(3_000);

		// Close the terminal
		execVSCodeQuickInput(">Terminal: Detach Session");
		cy.wait(3_000);
	})
})