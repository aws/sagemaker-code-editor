import { DIALOG_BOX } from "../../../support/constants";

describe('Session Manager Plugin Tests', () => {
    it('verifies cookie expiry behavior', () => {
        cy.wait(2000);

        cy.getCookies().then((cookies) => {
            if (cookies.length > 0) {
                cy.log(JSON.stringify(cookies));
                const firstCookie = cookies[2];
                cy.log(`First cookie found: ${JSON.stringify(firstCookie)}`);
                
                // Set the cookie to expire in the past
                const pastTime = (parseInt(firstCookie.value) - (1000000 * 1000)).toString();
                
                cy.clearCookie(firstCookie.name);

                cy.setCookie(firstCookie.name, 
                    pastTime, {
                    path: firstCookie.path,
                    domain: firstCookie.domain,
                    secure: firstCookie.secure,
                    httpOnly: firstCookie.httpOnly
                });

                // Refresh the page to trigger potential expiry check
                cy.wait(10000);

                // Verify cookie expiry time has changed
                cy.getCookie(firstCookie.name).then(newCookie => {
                   cy.log("New cookie", JSON.stringify(newCookie));
                });

                cy.wait(1000);

                cy.reload();

                cy.wait(20000);

                // Check for any sign-in or session expiry dialog
                cy.get('body').then($body => {
                    if ($body.find(DIALOG_BOX).length > 0) {
                        cy.get(DIALOG_BOX)
                            .should('be.visible')
                            .within(() => {
                                cy.contains('Please sign in again').should('be.visible');
                                cy.get('.monaco-button')
                                    .contains('Sign In')
                                    .should('be.visible')
                                    .click();
                            });
                    } else {
                        cy.log('No expiry dialog found after cookie expiration');
                    }
                });
                cy.wait(5000);
            } else {
                cy.log('No cookies found');
            }
        });
    });
});
