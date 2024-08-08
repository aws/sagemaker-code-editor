// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import 'cypress-wait-until';
import { DEBUG, RUN_LOCAL, WEBSITE, visitOSS } from './commands';

// https://stackoverflow.com/questions/62980435/the-following-error-originated-from-your-application-code-not-from-cypress
Cypress.on('uncaught:exception', (err, runnable) => {
	// Handle the uncaught exception here
	// Return false to prevent Cypress from failing the test
	return false;
});

// Open the website before every test
beforeEach(() => {
	cy.log(`DEBUG=${DEBUG}`);
	cy.log(`RUN_LOCAL=${RUN_LOCAL}`);
	cy.log(`WEBSITE=${WEBSITE}`);
	visitOSS();
});

// The set of directories the testing framework has opened so far
export let openedDirectories: Set<string> = new Set();