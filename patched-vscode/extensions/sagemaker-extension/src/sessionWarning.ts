import * as vscode from "vscode";
import {
    IAM_MESSAGE,
    isSSOMode, SagemakerCookie,
    SIGN_IN_BUTTON,
    SIGN_IN_HEADER,
    SIGN_IN_MESSAGE, SIGN_IN_MESSAGE_WHEN_REDIRECT_URL_DOES_NOT_EXIST, SSO_MESSAGE,
    WARNING_TIME_BUTTONS,
    WARNING_TIME_HEADER
} from "./constant";

export class SessionWarning {

    public static sessionExpiringWarning (warningTime: number, cookie: SagemakerCookie): Thenable<string | undefined> {
        // convert warningTime from ms to minutes;
        const warningTimeInMinutes: number = Math.floor(warningTime / 60000);
        const detail: string = `Your session will expire in ${warningTimeInMinutes} minutes. If your session expires, you could lose unsaved changes \n ${isSSOMode(cookie) ? SSO_MESSAGE : IAM_MESSAGE}`
        const sessionExpiringOptions: vscode.MessageOptions = {
            detail: detail,
            modal: true
        };

        // Session expiration warning...
        if (isSSOMode(cookie)) {
            return vscode.window.showWarningMessage(WARNING_TIME_HEADER, sessionExpiringOptions, ...WARNING_TIME_BUTTONS.SSO);
        } else {
            return vscode.window.showWarningMessage(WARNING_TIME_HEADER, sessionExpiringOptions, ...WARNING_TIME_BUTTONS.IAM);
        }
    }

    public static signInWarning (cookie: SagemakerCookie): Thenable<string | undefined> {
        const signInOptions: vscode.MessageOptions = {
            detail: cookie.redirectURL ? SIGN_IN_MESSAGE : SIGN_IN_MESSAGE_WHEN_REDIRECT_URL_DOES_NOT_EXIST,
            modal: true
        };

		// SignIn warning...
        if (cookie.redirectURL) {
            return vscode.window.showErrorMessage(SIGN_IN_HEADER, signInOptions, SIGN_IN_BUTTON);
        } else {
            return vscode.window.showErrorMessage(SIGN_IN_HEADER, signInOptions);
        }
    }
}