import * as vscode from 'vscode';
import * as fs from 'fs';
import { SessionWarning } from "./sessionWarning";
import {
    FIFTEEN_MINUTES_INTERVAL_MILLIS,
    FIVE_MINUTES_INTERVAL_MILLIS,
    SAGEMAKER_METADATA_PATH,
    SIGN_IN_BUTTON,
    WARNING_BUTTON_REMIND_ME_IN_5_MINS,
    WARNING_BUTTON_SAVE,
    WARNING_BUTTON_SAVE_AND_RENEW_SESSION,
    SagemakerCookie,
    SagemakerResourceMetadata,
    getExpiryTime,
    getSmusVscodePortalUrl
} from "./constant";
import * as console from "console";


const PARSE_SAGEMAKER_COOKIE_COMMAND = 'sagemaker.parseCookies';
const ENABLE_AUTO_UPDATE_COMMAND = 'workbench.extensions.action.enableAutoUpdate';

// Global redirect URL for SMUS environment
let smusRedirectUrl: string | null = null;

function fetchMetadata(): SagemakerResourceMetadata | null {
    try {
        const data = fs.readFileSync(SAGEMAKER_METADATA_PATH, 'utf-8');
        return JSON.parse(data) as SagemakerResourceMetadata;
    } catch (error) {
        // fail silently not to block users
        console.error('Error reading metadata file:', error);
        return null;
    }
}

function initializeSmusRedirectUrl() {
    smusRedirectUrl = getSmusVscodePortalUrl(fetchMetadata());
}

function showWarningDialog() {
    vscode.commands.executeCommand(PARSE_SAGEMAKER_COOKIE_COMMAND).then(response => {

        const sagemakerCookie: SagemakerCookie = response as SagemakerCookie
        const remainingTime: number = getExpiryTime(sagemakerCookie) - Date.now();

        if(!(Object.keys(sagemakerCookie).length === 0)) {
            if (getExpiryTime(sagemakerCookie) != null && remainingTime > FIFTEEN_MINUTES_INTERVAL_MILLIS) {
                // This means cookie has been reset, reinitializing again
                initialize(sagemakerCookie);
            } else if (getExpiryTime(sagemakerCookie) != null && remainingTime > 0) {
                // READ COOKIE again to decide to show this up

                SessionWarning.sessionExpiringWarning(remainingTime, sagemakerCookie)
                    .then((selection) => {
                        if (selection === WARNING_BUTTON_REMIND_ME_IN_5_MINS) {
                            // Trigger the function to show the warning again after 5 minutes.
                            setTimeout(showWarningDialog, FIVE_MINUTES_INTERVAL_MILLIS);
                        } else if (selection === WARNING_BUTTON_SAVE) {
                            saveWorkspace();
                        } else if (selection === WARNING_BUTTON_SAVE_AND_RENEW_SESSION) {
                            saveWorkspace();
                            // Trigger the function to make an API call to renew the session.
                            renewSession(sagemakerCookie);
                        }
                    });

            } else {
                // this means expiryTime cookie is either invalid or <0
                signInError(sagemakerCookie);
            }
        } else {
            // no cookie found so assuming its running locally
        }

    });

}

function signInError(sagemakerCookie: SagemakerCookie) {
    const redirectUrl = getRedirectUrl(sagemakerCookie);
    // The session has expired
    SessionWarning.signInWarning(sagemakerCookie)
        .then((selection) => {
            if (selection === SIGN_IN_BUTTON) {
                vscode.env.openExternal(vscode.Uri.parse(redirectUrl));
            }
        });
}

function initialize(sagemakerCookie: SagemakerCookie) {
    const currentTime = Date.now();
    const timeToExpiry = getExpiryTime(sagemakerCookie) - currentTime;

    if (timeToExpiry <= 0) {
        signInError(sagemakerCookie);
    } else if (timeToExpiry >= FIFTEEN_MINUTES_INTERVAL_MILLIS) {
        const warningTime = timeToExpiry - FIFTEEN_MINUTES_INTERVAL_MILLIS;
        setTimeout(() => {
            showWarningDialog();
        }, warningTime);
    } else {
        // If less than or equal to 15 minutes left, set a timer for the remaining time
        const warningTime = timeToExpiry % FIVE_MINUTES_INTERVAL_MILLIS;
        setTimeout(() => {
            showWarningDialog();
        }, warningTime);
    }
}

function saveWorkspace() {
    vscode.workspace.saveAll().then(() => {
        // TODO: log workspace saved
    });
}
function renewSession(sagemakerCookie: SagemakerCookie) {
    const redirectUrl = getRedirectUrl(sagemakerCookie);
    // TODO: Log and trigger a Signin
    vscode.env.openExternal(vscode.Uri.parse(redirectUrl));
    // Trigger the function to show the warning again after 5 minutes again to validate.
    setTimeout(showWarningDialog, FIVE_MINUTES_INTERVAL_MILLIS);
}

function updateStatusItemWithMetadata(context: vscode.ExtensionContext) {
    const metadata = fetchMetadata();
    if (metadata?.SpaceName) {
        let spaceNameStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        spaceNameStatusBarItem.text = `Space: ${metadata.SpaceName}`;
        spaceNameStatusBarItem.show();
        context.subscriptions.push(spaceNameStatusBarItem);
    }
}

// Render warning message regarding auto upgrade disabled
function renderExtensionAutoUpgradeDisabledNotification() {
    // Get current extension auto disabled config
    const autoUpdateEnabled = vscode.workspace.getConfiguration('extensions').get('autoUpdate');

    // Check if customer has choose to disable this notification
    const extensionConfig = vscode.workspace.getConfiguration('sagemaker-extension');
    const showNotificationEnabled = extensionConfig.get('notification.extensionAutoUpdateDisabled', true);

    // Only show notification, if auto update is disabled, and customer hasn't opt-out the notification
    if (showNotificationEnabled && autoUpdateEnabled == false) {
        const enableAutoUpdate = 'Enable Auto Update Extensions';
        const doNotShowAgain = 'Do not show again';
        vscode.window.showInformationMessage(
            'Extension auto-update is disabled. This can be changed in Code Editor settings.',
            enableAutoUpdate,
            doNotShowAgain,
        ).then(response => {
            if (response === enableAutoUpdate) {
                vscode.commands.executeCommand(ENABLE_AUTO_UPDATE_COMMAND)
            } else if (response == doNotShowAgain) {
                extensionConfig.update(
                    'notification.extensionAutoUpdateDisabled',
                    false,
                    vscode.ConfigurationTarget.Global
                );
            }
        })
    }
}

export function activate(context: vscode.ExtensionContext) {

    // TODO: log activation of extension
    console.log('Activating Sagemaker Extension...');

    // First set smusRedirectUrl if we are in SMUS environment
    initializeSmusRedirectUrl();

    // execute the get cookie command and save the data to cookies
    vscode.commands.executeCommand(PARSE_SAGEMAKER_COOKIE_COMMAND).then(r => {

        const sagemakerCookie: SagemakerCookie = r as SagemakerCookie

        initialize(sagemakerCookie);
        updateStatusItemWithMetadata(context);
    });

    // render warning message regarding auto upgrade disabled
    renderExtensionAutoUpgradeDisabledNotification();
}

/**
 * Returns the appropriate redirect URL based on the environment
 * Uses SMUS URL if available, falls back to original redirect URL
 */
function getRedirectUrl(sagemakerCookie: SagemakerCookie): string {
    return smusRedirectUrl || sagemakerCookie.redirectURL;
}
