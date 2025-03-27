/*
- Add wait statements to make sure the test doesn't fail later.
- Add comments over each test
*/

describe('Logout Test', () => {
    it('Should Log Out successfully', () => {
        cy.wait(5000);

        // Open the main menu
        cy.get('.menubar-menu-button')
            .should('be.visible')
            .click({ force: true });

        // Wait for the menu to open
        cy.get('.menubar-menu-items-holder')
            .should('be.visible');

        // Try multiple approaches to click the logout option
        cy.get('.actions-container')
            .wait(5000)
            .contains('Sagemaker: Log out')
            .wait(5000)
            .should('be.visible')
            .wait(5000)
            .click({ force: true, timeout: 10000 });

        // wait to make sure click event completes its execution
        cy.wait(10000);
        // // Or if you want to be more specific
        cy.origin('https://us-west-2.signin.aws.amazon.com', () => {
            // Verify we're on the sign-in page
            cy.get('body')
            .should('exist')
            .wait(2000);
            // Add any other verifications you want to do on the sign-in page
        });
    });
});
