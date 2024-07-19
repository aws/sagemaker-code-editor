import { openedDirectories } from "../../support/e2e";
import { openFolder } from "../../support/commands";


describe('Opens folder', () => {
  
	it('opens folder', () => {
		// TODO: make directory from terminal
		// Open a folder
		openFolder(openedDirectories, 'code/trash', false);
	})
})