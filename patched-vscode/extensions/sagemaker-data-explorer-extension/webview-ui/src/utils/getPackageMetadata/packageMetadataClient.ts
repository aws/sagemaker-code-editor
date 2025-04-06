import { Partition, getLotusHost } from './partitionInfo';
import type { PackageMetadataRequestConfig, PackageMetadataResponse } from './types';
import { ErrorTypes, LotusMetadataClientError } from './types';
import { buildPackageMetadataApiUrl, isValidResponse, lotusFetch } from './utils';

export const getPackageMetadata = async ({
  packageName,
  majorVersion,
  host,
  aliasName,
}: PackageMetadataRequestConfig): Promise<PackageMetadataResponse> => {
  if (!packageName || !majorVersion) {
    throw new LotusMetadataClientError({
      name: ErrorTypes.InvalidParametersError,
      message: 'Missing package name or majorVersion.',
    });
  }

  const lotusHost = host ?? getLotusHost(Partition.AWS);

  const packageMetadataApiUrl = buildPackageMetadataApiUrl(lotusHost, packageName, majorVersion, aliasName);
  const fetchResponse = await lotusFetch(packageMetadataApiUrl);
  const responseStatus = fetchResponse.status;
  const bodyString = await fetchResponse.text();
  // @typescript-eslint/no-explicit-any
  let responseBodyJson: any;
  try {
    // @typescript-eslint/no-unsafe-assignment
    responseBodyJson = JSON.parse(bodyString);
  } catch (error) {
    throw new LotusMetadataClientError({
      name: ErrorTypes.InvalidResponseError,
      message: `Response body is not a valid JSON`,
      cause: error as Error,
      status: responseStatus,
    });
  }

  if (responseStatus >= 200 && responseStatus < 300) {
    /* Handle success status code */
    const response: PackageMetadataResponse = responseBodyJson as PackageMetadataResponse;
    /* Validate API response to see if it meets expectation */
    if (!isValidResponse(response)) {
      throw new LotusMetadataClientError({
        name: ErrorTypes.InvalidResponseError,
        message: 'Invalid metadata structure in response body',
      });
    }
    return response;
  }

  /* Handle failure status codes */
  // @typescript-eslint/no-unsafe-member-access
  const errMessage = `HTTP get request failed with status: '${responseStatus}', error: '${responseBodyJson.code}' and message: '${responseBodyJson.message}'`;
  throw new LotusMetadataClientError({
    name: ErrorTypes.InvalidResponseError,
    message: errMessage,
    status: responseStatus,
  });
};
