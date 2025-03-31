import * as assert from 'assert';
import * as vscode from 'vscode';

const DEFAULT_DARK_MODERN = 'Default Dark Modern';
const DEFAULT_LIGHT_MODERN = 'Default Light Modern';

async function waitForThemeChange(expectedTheme: string | undefined, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const currentTheme = vscode.workspace.getConfiguration('workbench').inspect('colorTheme');

        if (currentTheme?.globalValue === expectedTheme) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Theme did not change to ${expectedTheme} at the global level within ${timeoutMs}ms`);
}

suite('SageMaker UI Dark Theme Extension Tests - In SageMaker Unified Studio Environment', () => {
    // Store original ENV variable value
    const originalEnv = process.env.SERVICE_NAME;

    suiteSetup(() => {
        // Clear the theme configurations
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Global);
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Workspace);

        // Set ENV variable value for SageMaker Unified Studio environment
        process.env.SERVICE_NAME = 'SageMakerUnifiedStudio';
    });

    suiteTeardown(() => {
        // Clear the theme configurations
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Global);

        // Restore ENV variable value to original
        originalEnv ? (process.env.SERVICE_NAME = originalEnv) : delete process.env.SERVICE_NAME;
    });

    test('Theme is set when global and workspace theme configurations are unset', async () => {
        // Poll for theme update
        await waitForThemeChange(DEFAULT_DARK_MODERN, 10000);

        const config = vscode.workspace.getConfiguration();
        const theme = config.inspect('workbench.colorTheme');

        assert.strictEqual(theme?.globalValue, DEFAULT_DARK_MODERN, `Global theme should be set to ${DEFAULT_DARK_MODERN}`);
    });
});

suite('SageMaker UI Dark Theme Extension Tests - In SageMaker Unified Studio Environment', () => {
    // Store original ENV variable value
    const originalEnv = process.env.SERVICE_NAME;

    suiteSetup(() => {
        // Set the global theme configuration to Default Light Modern
        vscode.workspace.getConfiguration('workbench').update('colorTheme', DEFAULT_LIGHT_MODERN, vscode.ConfigurationTarget.Global);
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Workspace);

        // Set ENV variable value for SageMaker Unified Studio environment
        process.env.SERVICE_NAME = 'SageMakerUnifiedStudio';
    });

    suiteTeardown(() => {
        // Clear the theme configurations
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Global);

        // Restore ENV variable value to original
        originalEnv ? (process.env.SERVICE_NAME = originalEnv) : delete process.env.SERVICE_NAME;
    });

    test('Theme is not set when global theme configuration is set', async () => {
        // Poll for theme update
        await waitForThemeChange(DEFAULT_LIGHT_MODERN, 10000);

        // Poll for Default Dark Modern theme update (expected to fail)
        try {
            await waitForThemeChange(DEFAULT_DARK_MODERN, 10000);
            assert.fail(`Global theme should be kept as ${DEFAULT_LIGHT_MODERN}`);
        } catch (error) {
            // Expected behavior: Theme should not be set
        }

        const config = vscode.workspace.getConfiguration();
        const theme = config.inspect('workbench.colorTheme');

        assert.strictEqual(theme?.globalValue, DEFAULT_LIGHT_MODERN, `Global theme should be kept as ${DEFAULT_LIGHT_MODERN}`);
    });
});

suite('SageMaker UI Dark Theme Extension Tests - In SageMaker AI Environment', () => {
    // Store original ENV variable value
    const originalEnv = process.env.SERVICE_NAME;

    suiteSetup(() => {
        // Clear the global theme configuration
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Global);
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Workspace);

        // Ensure ENV variable value for SageMaker Unified Studio environment is NOT set
        delete process.env.SERVICE_NAME;
    });

    suiteTeardown(() => {
        // Clear the global theme configuration
        vscode.workspace.getConfiguration('workbench').update('colorTheme', undefined, vscode.ConfigurationTarget.Global);

        // Restore ENV variable value to original
        originalEnv ? (process.env.SERVICE_NAME = originalEnv) : delete process.env.SERVICE_NAME;
    });

    test('Theme is not set', async () => {
        // Poll for theme update
        await waitForThemeChange(undefined, 10000);

        const config = vscode.workspace.getConfiguration();
        const theme = config.inspect('workbench.colorTheme');

        assert.strictEqual(theme?.globalValue, undefined, 'Global theme should not be set');
    });
});
