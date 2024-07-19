import { defineConfig } from 'cypress';

// Import the Cypress object explicitly
import Cypress from 'cypress';

export default defineConfig({
	video: true,
	e2e: {
		specPattern: [
				'cypress/specs/core/open-application.cy.ts',
                                'cypress/specs/core/terminal.cy.ts',
				'cypress/specs/core/open-folder.cy.ts',
				'cypress/specs/added-features/extensions.cy.ts'
			],
		excludeSpecPattern: 'utils.ts',
		setupNodeEvents(on, config) {

			return config
		}
	}
});
