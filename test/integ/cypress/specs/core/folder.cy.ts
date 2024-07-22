import { openedDirectories } from "../../support/e2e";
import { openFolder, typeInTerminal, execVSCodeQuickInput } from "../../support/commands";

describe('Folder Operations', () => {
  
	it('opens folder', () => {
                // Create a directory
                typeInTerminal('mkdir tmp && mkdir tmp/trash');
                cy.wait(3_000);

                execVSCodeQuickInput(">Terminal: Detach Session");

		// Open a folder
		openFolder(openedDirectories, 'tmp/trash/', false);
	})
})