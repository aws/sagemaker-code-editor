import { createJupyterNotebook, typeAndExecuteInNotebook } from "../../../support/commands";

describe('Creates and runs a Jupyter notebook', () => {
  
    it('opens jupyter notebook', () => {
        const newFile = 'test-notebook';
        createJupyterNotebook(newFile);
        // Type and execute a Python command
        typeAndExecuteInNotebook('print("hello")', newFile);
    })
})