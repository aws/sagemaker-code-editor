import { defineConfig } from 'cypress';
import {exec} from 'child_process'
import { promisify } from 'util';

const execAsync = promisify(exec);

export default defineConfig({
	video: true,
    experimentalInteractiveRunEvents: true,
	e2e: {
		specPattern: [
				// 'cypress/specs/core/open-application.cy.ts',
                //                 'cypress/specs/core/terminal.cy.ts',
				// 'cypress/specs/core/folder.cy.ts',
				// 'cypress/specs/added-features/extensions.cy.ts',
                'cypress/specs/core/hosted/about.cy.ts'
                // 'cypress/specs/core/hosted/cookie.cy.ts',
                // 'cypress/specs/core/hosted/logout.cy.ts'
                // 'cypress/specs/core/hosted/jupyter.cy.ts'
                // 'cypress/specs/core/hosted/python.cy.ts'
                // 'cypress/specs/core/hosted/folder.cy.ts'
                // 'cypress/specs/added-features/extensions-ide.cy.ts'
			],
		excludeSpecPattern: 'utils.ts',
		async setupNodeEvents(on, config) {
            // Handle popup blocking
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.name === 'chrome') {
                    launchOptions.args.push('--disable-popup-blocking');
                }
                return launchOptions;
            });

            try {
                const listSpacesCommand = `aws sagemaker list-spaces \
                --domain-id ${config.env.DOMAIN_ID} \
                --region ${config.env.REGION}`;
            
                const spacesResult = await execAsync(listSpacesCommand);
                const spaces = JSON.parse(spacesResult.stdout);
                
                // Use the first available space or proceed without space parameter
                let urlCommand = `aws sagemaker create-presigned-domain-url \
                    --region ${config.env.REGION} \
                    --domain-id ${config.env.DOMAIN_ID} \
                    --user-profile-name ${config.env.USER_PROFILE} `;

                if (spaces && spaces.Spaces && spaces.Spaces.length > 0) {
                    urlCommand += ` --space-name ${spaces.Spaces[0].SpaceName}`;
                }

                const result = await execAsync(urlCommand);
                const response = JSON.parse(result.stdout);
                config.env = {
                    ...config.env,
                    WEBSITE: response.AuthorizedUrl
                };
            } catch (error) {
                console.error('Error:', error);
            }
            return config;
        }
	},
        env: {
			RUN_LOCAL: false,
			DOMAIN_ID: 'd-gcfoku5v5jqs',
			USER_PROFILE: 'default-1736382965850',
			ISENGARD_PRODUCTION_ACCOUNT:false,
			REGION: 'us-west-2'
        }
});