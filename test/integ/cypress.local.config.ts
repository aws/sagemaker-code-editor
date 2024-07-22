import { defineConfig } from 'cypress';

export default defineConfig({
	video: true,
	e2e: {
		specPattern: [
				'cypress/specs/core/open-application.cy.ts',
                                'cypress/specs/core/terminal.cy.ts',
				'cypress/specs/core/folder.cy.ts'
			],
		excludeSpecPattern: 'utils.ts',
		setupNodeEvents(on, config) {

			return config
		}
	},
        env: {
                RUN_LOCAL: true
        }
});
