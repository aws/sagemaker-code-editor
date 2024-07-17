import { defineConfig } from 'cypress';

// Import the Cypress object explicitly
import Cypress from 'cypress';

export default defineConfig({
	video: true,
	e2e: {
		setupNodeEvents(on, config) {

		return config
	}
	}
});
