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
    getExpiryTime
} from "./constant";
import * as console from "console";


const PARSE_SAGEMAKER_COOKIE_COMMAND = 'sagemaker.parseCookies';

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

            } else if (getExpiryTime(sagemakerCookie) == -1 || remainingTime <=0) {
                // this means expiryTime cookie is either invalid or <0
                signInError(sagemakerCookie);
            }
        } else {
            // no cookie found so assuming its running locally
        }

    });

}

function signInError(sagemakerCookie: SagemakerCookie) {
    // The session has expired
    SessionWarning.signInWarning(sagemakerCookie)
        .then((selection) => {
            if (selection === SIGN_IN_BUTTON) {
                vscode.env.openExternal(vscode.Uri.parse(<string>sagemakerCookie.redirectURL));
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
    // TODO: Log and trigger a Signin
    vscode.env.openExternal(vscode.Uri.parse(<string>sagemakerCookie.redirectURL));
    // Trigger the function to show the warning again after 5 minutes again to validate.
    setTimeout(showWarningDialog, FIVE_MINUTES_INTERVAL_MILLIS);
}

function updateStatusItemWithMetadata(context: vscode.ExtensionContext) {
    fs.readFile(SAGEMAKER_METADATA_PATH, 'utf-8', (err, data) => {
        if (err) {
            // fail silently not to block users
        } else {
            try {
                const jsonData = JSON.parse(data) as SagemakerResourceMetadata;
                const spaceName = jsonData.SpaceName;

                if (spaceName != null) {
                    let spaceNameStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
                    spaceNameStatusBarItem.text = `Space: ${spaceName}`;
                    spaceNameStatusBarItem.show();
                    context.subscriptions.push(spaceNameStatusBarItem);
                }
            } catch (jsonError) {
                // fail silently not to block users
            }
        }
    });
}

export function activate(context: vscode.ExtensionContext) {

    // TODO: log activation of extension
    console.log('Activating Sagemaker Extension...');

    // execute the get cookie command and save the data to cookies
    vscode.commands.executeCommand(PARSE_SAGEMAKER_COOKIE_COMMAND).then(r => {

        const sagemakerCookie: SagemakerCookie = r as SagemakerCookie

        initialize(sagemakerCookie);
        updateStatusItemWithMetadata(context);
    });
}
