import { createPythonFile , typeInFile, runAndPrintOnFile} from "../../../support/commands";


describe('SageMaker Python Test', () => {
    it('It should type in a python file and verify the kernel runs, and also goto function works', () => {
        const randomString = "hello";
        createPythonFile('test');
        cy.wait(5000);
        typeInFile('test', `print("${randomString}")`);
        runAndPrintOnFile('output', 'test', randomString);
    });
});
