import { LOTUS_METADATA_PATH } from './partitionInfo';
import { ErrorTypes, type PackageMetadataResponse } from './types';

const REQUEST_TIMEOUT = 5000;
const MAX_TRIES = 3;
const RETRY_DELAY = 100;
const unretryableStatusCodes = [400, 401, 403, 404, 413, 415];

const delayRetry = async (attemptIndex: number, delayInMs: number): Promise<void> => {
  const delay = Math.random() * 2 ** attemptIndex * delayInMs;
  await new Promise(resolve => setTimeout(resolve, delay));
};

export function buildPackageMetadataApiUrl(
  lotusHost: string,
  packageName: string,
  majorVersion: string,
  aliasName?: string
): URL {
  const packageMetadataApiUrl = new URL(`https://${lotusHost}${LOTUS_METADATA_PATH}`);
  packageMetadataApiUrl.searchParams.append('packageName', packageName);
  packageMetadataApiUrl.searchParams.append('majorVersion', majorVersion);

  if (aliasName) {
    packageMetadataApiUrl.searchParams.append('aliasName', aliasName);
  }
  return packageMetadataApiUrl;
}

export interface RequestConfig {
  timeout?: number;
  tries?: number;
  retryDelay?: number;
}

/**
 * Function for making fetch call
 * @param {string} url
 * @param {RequestInit} init
 * @param {RequestConfig} requestConfig
 * @returns {Promise<Response>}
 */
export async function lotusFetch(url: URL, requestConfig?: RequestConfig): Promise<Response> {
  const tries = requestConfig?.tries || MAX_TRIES;
  const retryDelay = requestConfig?.retryDelay || RETRY_DELAY;
  const timeout = requestConfig?.timeout || REQUEST_TIMEOUT;

  let latestError = new Error('Error');
  let latestResponse: Response | undefined;
  let controller: AbortController | undefined;

  for (let attemptIndex = 0; attemptIndex < tries; attemptIndex++) {
    let timer;
    try {
      // Set request to timeout after REQUEST_TIMEOUT milliseconds
      if (!controller) {
        controller = new AbortController();
      }
      timer = setTimeout(() => {
        controller?.abort(); // break current loop
      }, timeout);

      // fetch
      const requestInit = { signal: controller.signal as AbortSignal };
      latestResponse = await fetch(url.toString(), requestInit);

      if (latestResponse.status >= 200 && latestResponse.status < 300) {
        break;
      }
      if (unretryableStatusCodes.includes(latestResponse.status)) {
        break;
      }
    } catch (error) {
      latestError = error as Error;
      if ((latestError.name as ErrorTypes) === ErrorTypes.AbortError) {
        // Use Network Error instead of AbortError for consistency with Console Web Client
        latestError = new Error('Timed out');
        latestError.name = ErrorTypes.NetworkError;
      } else {
        latestError = new Error(`Fetch error: ${latestError.message}`);
        latestError.name = ErrorTypes.NetworkError;
      }
    }
    await delayRetry(attemptIndex, retryDelay);
    if (timer) {
      clearTimeout(timer);
    }
  }
  if (latestResponse !== undefined) {
    return latestResponse;
  }
  throw latestError;
}

export const isValidResponse = (response: PackageMetadataResponse): boolean => {
  return !!(
    response?.basePath &&
    response?.versionId &&
    (response?.metadata?.module ?? response?.metadata?.assets?.length)
  );
};
