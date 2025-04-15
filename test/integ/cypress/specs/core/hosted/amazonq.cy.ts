import { createPythonFile , typeInFile, verifyNumberOfCodeLines} from "../../../support/commands";


  
describe('AmazonQ', () => {
    it('Amazon Q should be able to generate code recommendations', () => {
        const codeInput = 'def calculator()';
        createPythonFile('test');
        cy.wait(5000);
        typeInFile('test', codeInput);
        verifyNumberOfCodeLines('test', codeInput);
    });
});
