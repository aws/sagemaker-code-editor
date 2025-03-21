export interface PackageMetadataRequestConfig {
  packageName: string;
  majorVersion: string;
  host?: string;
  aliasName?: string;
}

export class LotusMetadataClientError extends Error {
  public readonly status?: number;
  constructor({ name, message, cause, status }: { name: string; message: string; cause?: Error; status?: number }) {
    super(message, cause);
    this.status = status;
    this.name = name;
  }
}

export enum ErrorTypes {
  NetworkError = 'NetworkError',
  InvalidParametersError = 'InvalidParametersError',
  InvalidResponseError = 'InvalidResponseError',
  AbortError = 'AbortError',
}

export interface PackageMetadataResponse {
  metadata: Metadata;
  versionId: string;
  basePath: string;
  cspHandlerQueryString?: string;
}

export interface Metadata {
  assets?: Asset[];
  module?: Module;
}

export interface Module {
  moduleType: ModuleType;
  path: string;
  htmlAttributes: HTMLAttribute[];
}

export interface Asset {
  path: string;
  tag: Tag;
  htmlAttributes: HTMLAttribute[];
}

export type Tag = 'script' | 'link';

export interface HTMLAttribute {
  name: string;
  value: string;
}

export type ModuleType = 'AWT' | 'NATIVE';
