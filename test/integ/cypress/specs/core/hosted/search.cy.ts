import { createPythonFile, typeInFile } from "../../../support/commands";

describe('SageMaker Search Test', () => {
    it('should search for SageMaker and display results', () => {
    // createJupyterNotebook('test-notebook');
    cy.wait(10000);

    createPythonFile('test');
    typeInFile('test', 'print("hello")');

     // Step 1: Click 'Search' icon in left toolbar
      cy.get('[class="action-label codicon codicon-search-view-icon"]')
        .should('be.visible')
        .click()
    
    
    cy.get('[class="ibwrapper"]')
        .first()
        .should('be.visible')
        .then(() => {
            cy.get('textarea.input[placeholder="Search"]')
            .should('be.visible')
            .type('hello', {
                force: true,
                delay: 700
            })
            .type('{enter}')
    });

    // Verify search results
    cy.get('.results')
        .should('be.visible')
        .within(() => {
            cy.contains('hello')
                .should('be.visible');

    });

    });

});
  