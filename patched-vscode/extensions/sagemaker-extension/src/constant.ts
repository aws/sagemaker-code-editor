// Constants
export const WARNING_TIME_HEADER = 'Session expiring soon';

export const WARNING_BUTTON_REMIND_ME_IN_5_MINS = 'Remind me in 5 minutes';
export const WARNING_BUTTON_SAVE = 'Save';
export const WARNING_BUTTON_SAVE_AND_RENEW_SESSION = 'Save and renew session';
export const WARNING_TIME_BUTTONS = {
	SSO: [WARNING_BUTTON_REMIND_ME_IN_5_MINS, WARNING_BUTTON_SAVE],
	IAM: [WARNING_BUTTON_REMIND_ME_IN_5_MINS, WARNING_BUTTON_SAVE_AND_RENEW_SESSION]
};

// Constants for signInWarning
export const SIGN_IN_HEADER = 'Please sign in again';
export const SIGN_IN_MESSAGE = "You were logged out of your account. Choose 'Sign In' to continue using this workplace.";
export const SIGN_IN_MESSAGE_WHEN_REDIRECT_URL_DOES_NOT_EXIST = "You were logged out of your account. You are not able to\n" +
	"                  perform actions in your workplace at this time. Please start a\n" +
	"                  new session.";
export const SIGN_IN_BUTTON = 'Sign In';
export const SSO_MESSAGE = 'To renew the session, log out from Studio App via "File" -> "Log Out" and then "Sign out" from AWS IAM Identity Center (successor to AWS SSO) user portal. Do you want to save all changes now?';
export const IAM_MESSAGE = 'Do you want to renew your session now?'
export enum AUTH_MODE {
	SSO = "Sso",
	IAM = "Iam"
}
export const FIFTEEN_MINUTES_INTERVAL_MILLIS = 15 * 60 * 1000;
export const FIVE_MINUTES_INTERVAL_MILLIS = 5 * 60 * 1000;

export const SAGEMAKER_METADATA_PATH = '/opt/ml/metadata/resource-metadata.json';

export class SagemakerCookie {
	authMode: string
	expiryTime: number
	ssoExpiryTimestamp: number
	studioUserProfileName: string
	redirectURL: string

	constructor(
		authMode: string,
		expiryTime: number,
		ssoExpiryTimestamp: number,
		studioUserProfileName: string,
		redirectURL: string
	) {
		this.authMode = authMode;
		this.expiryTime = expiryTime;
		this.ssoExpiryTimestamp = ssoExpiryTimestamp
		this.studioUserProfileName = studioUserProfileName
		this.redirectURL = redirectURL
	}
};

export class SagemakerResourceMetadata {
	AppType?: string
	DomainId?: string
	SpaceName?: string
	ResourceArn?: string
	ResourceName?: string
	AppImageVersion?: string
};
export function isSSOMode(cookie: SagemakerCookie) {
	return (cookie.authMode === AUTH_MODE.SSO)
}

export function getExpiryTime(cookie: SagemakerCookie): number {
	if (AUTH_MODE.SSO === cookie.authMode) {
		return cookie.ssoExpiryTimestamp;
	} else if (AUTH_MODE.IAM === cookie.authMode) {
		return cookie.expiryTime;
	} else {
		return -1;
	}
}