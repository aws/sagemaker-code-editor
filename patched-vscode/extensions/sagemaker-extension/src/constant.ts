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

// Service name identifier for SageMaker Unified Studio
export const SMUS_SERVICE_NAME = 'SageMakerUnifiedStudio';
export const SERVICE_NAME_ENV_VAR = 'SERVICE_NAME';

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
	AdditionalMetadata?: {
		DataZoneDomainId?: string
		DataZoneProjectId?: string
		DataZoneDomainRegion?: string
	}
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

/**
 * Constructs the SMUS portal URL using domain, region, and project information
 * Returns null if not in SMUS environment or if required fields are missing
 */
export const getSmusVscodePortalUrl = (metadata: SagemakerMetadata): string | null => {
	if (process.env[SERVICE_NAME_ENV_VAR] !== SMUS_SERVICE_NAME) {
		return null;
	}

	if (!metadata || !metadata.AdditionalMetadata) {
		// fail silently not to block users
		console.error('[SMUS] Metadata is undefined or null');
		return null;
	}

	const { DataZoneDomainId, DataZoneDomainRegion, DataZoneProjectId } = metadata.AdditionalMetadata;

	if (!DataZoneDomainId || !DataZoneDomainRegion || !DataZoneProjectId) {
		// fail silently not to block users
		// TODO: add monitoring to detect such cases
		console.error('[SMUS] Required fields missing in metadata:', {
			DataZoneDomainId: !!DataZoneDomainId,
			DataZoneDomainRegion: !!DataZoneDomainRegion,
			DataZoneProjectId: !!DataZoneProjectId
		});
		return null;
	}

	return `https://${DataZoneDomainId}.sagemaker.${DataZoneDomainRegion}.on.aws/projects/${DataZoneProjectId}/overview`;
}
