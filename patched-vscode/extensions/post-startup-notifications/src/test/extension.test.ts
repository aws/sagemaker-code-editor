import * as vscode from 'vscode';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { activate, deactivate } from '../extension';
import { POST_START_UP_STATUS_FILE, SERVICE_NAME_ENV_KEY, SERVICE_NAME_ENV_VALUE } from '../constant';

type MockCall = [string, (path: string) => void];

interface MockFSWatcher extends chokidar.FSWatcher {
    on: jest.Mock;
    close: jest.Mock;
}

// Mocks setup
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn().mockReturnValue(Promise.resolve()),
        createOutputChannel: jest.fn()
    },
    env: {
        openExternal: jest.fn()
    },
    Uri: {
        parse: jest.fn(url => ({ toString: () => url }))
    }
}));

jest.mock('fs');
jest.mock('chokidar');

describe('SageMaker Unified Studio Extension Tests', () => {
    let mockContext: vscode.ExtensionContext;
    let mockWatcher: MockFSWatcher;
    let mockOutputChannel: vscode.OutputChannel;

    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks();

        // Setup context with globalState for storage
        mockContext = { 
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([])
            }
        } as any;

        // Setup watcher
        mockWatcher = {
            on: jest.fn().mockReturnThis(),
            close: jest.fn()
        } as any;

        mockOutputChannel = {
            appendLine: jest.fn(),
            dispose: jest.fn()
        } as any;

        (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        process.env[SERVICE_NAME_ENV_KEY] = SERVICE_NAME_ENV_VALUE;
    });

    // Helper function to get watcher callbacks
    const getWatcherCallback = (eventType: string): ((path: string) => void) => {
        const call = mockWatcher.on.mock.calls.find(
            (call: MockCall) => call[0] === eventType
        );
        return call ? call[1] : jest.fn();
    };

    // Helper function to simulate file content
    const simulateFileContent = (content: object): void => {
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(content));
    };

    describe('Activation Tests', () => {
        test('should not activate outside SageMaker environment', () => {
            process.env[SERVICE_NAME_ENV_KEY] = 'wrong-value';
            activate(mockContext);
            expect(vscode.window.createOutputChannel).not.toHaveBeenCalled();
        });

        test('should initialize properly in SageMaker environment', () => {
            activate(mockContext);
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
                'SageMaker Unified Studio Post Startup Notifications'
            );
            expect(chokidar.watch).toHaveBeenCalledWith(
                POST_START_UP_STATUS_FILE,
                expect.objectContaining({
                    persistent: true,
                    ignoreInitial: false
                })
            );
        });

        test('should handle watcher setup errors', () => {
            const error = new Error('Setup error');
            (chokidar.watch as jest.Mock).mockImplementation(() => { throw error; });
            activate(mockContext);
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        });
    });

    describe('File Processing Tests', () => {
        test('should handle error status', () => {
            simulateFileContent({
                status: 'error',
                message: 'Test error message'
            });

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Test error message');
        });

        test('should handle in-progress status', () => {
            simulateFileContent({
                status: 'in-progress',
                message: 'Processing message'
            });

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Processing message');
        });

        test('should not show message for unchanged status', () => {
            simulateFileContent({
                status: 'error',
                message: 'Error message'
            });

            activate(mockContext);
            const addCallback = getWatcherCallback('add');
            addCallback('test-path');
            expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);

            addCallback('test-path');
            expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        });

        test('should handle file removal', () => {
            activate(mockContext);
            getWatcherCallback('unlink')('test-path');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('File test-path has been removed');
        });
    });

    describe('Error Handling Tests', () => {
        test('should handle invalid JSON', () => {
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Error processing status file')
            );
        });

        test('should handle file read errors', () => {
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Read error');
            });

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Error processing status file')
            );
        });

        test('should ignore ENOENT errors', () => {
            const error = new Error('File not found');
            (error as any).code = 'ENOENT';
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw error;
            });

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
        });

        test('should handle missing status or message', () => {
            simulateFileContent({});

            activate(mockContext);
            getWatcherCallback('add')('test-path');

            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });
    });

    describe('Q CLI Notification Tests', () => {
        test('should show Q CLI notification with Learn More button', () => {
            // Set up globalState to simulate first-time user
            (mockContext.globalState.get as jest.Mock).mockReturnValue(undefined);
            
            activate(mockContext);
            
            // Verify notification is shown with correct message and button
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'The Amazon Q Command Line Interface (CLI) is installed. You can now access AI-powered assistance in your terminal.',
                { modal: false },
                { title: 'Learn More', isCloseAffordance: false }
            );
        });
        
        test('should open documentation when Learn More is clicked', async () => {
            // Set up globalState to simulate first-time user
            (mockContext.globalState.get as jest.Mock).mockReturnValue(undefined);
            
            // Mock the user clicking "Learn More"
            const mockSelection = { title: 'Learn More' };
            (vscode.window.showInformationMessage as jest.Mock).mockReturnValue(Promise.resolve(mockSelection));
            
            activate(mockContext);
            
            // Wait for the promise to resolve
            await new Promise(process.nextTick);
            
            // Verify the documentation link is opened
            expect(vscode.env.openExternal).toHaveBeenCalledWith(
                expect.objectContaining({
                    toString: expect.any(Function)
                })
            );
            
            // Verify notification is marked as seen
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'notification_seen_smus_q_cli_notification', 
                true
            );
        });
        
        test('should not show notification if already seen', () => {
            // Set up globalState to simulate returning user who has seen notification
            (mockContext.globalState.get as jest.Mock).mockReturnValue(true);
            
            activate(mockContext);
            
            // Verify notification is not shown again
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });
    });
    
    describe('Deactivation Tests', () => {
        test('should cleanup resources properly', () => {
            activate(mockContext);
            deactivate();

            expect(mockWatcher.close).toHaveBeenCalled();
            expect(mockOutputChannel.dispose).toHaveBeenCalled();
        });
    });
});