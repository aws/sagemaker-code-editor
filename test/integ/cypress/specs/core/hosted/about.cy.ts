describe('About Page Test', () => {
    it('opens About dialog from Help menu and verifies dialog text', () => {
        // Wait for the page to load
        cy.wait(5000);

        // Open menu
        cy.get('.menubar-menu-button')
            .should('be.visible')
            .click({ force: true });

        // Click Help menu
        cy.contains('.action-label', 'Help')
            .should('be.visible')
            .click({ force: true });

        // Wait and then try to click About
        cy.wait(7000); // Wait for submenu animation
        
        // More specific targeting for the About option
        cy.get('.monaco-menu-container', {timeout: 6000})
            .last() // Get the most recently opened menu
            .find('.action-label')
            .contains('About')
            .should('be.visible')
            .click({timeout:5000});

        // Verify About dialog
        cy.contains('SageMaker Code Editor', { timeout: 10000 })
            .should('be.visible');

    });
});
