// constants
export const PERSISTENT_VOLUME_EXTENSIONS_DIR = "/home/sagemaker-user/sagemaker-code-editor-server-data/extensions";
export const IMAGE_EXTENSIONS_DIR = "/opt/amazon/sagemaker/sagemaker-code-editor-server-data/extensions";
export const LOG_PREFIX = "[sagemaker-extensions-sync]";

export class ExtensionInfo {
    constructor(
        public name: string,
        public publisher: string,
        public version: string,
        public path: string | null
    ) {}

    get identifier(): string {
        return `${this.publisher}.${this.name}@${this.version}`;
    }

    toString(): string {
        return `ExtensionInfo: ${this.identifier} (${this.path})`;
    }
}
