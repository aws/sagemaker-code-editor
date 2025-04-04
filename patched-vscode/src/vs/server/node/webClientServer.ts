/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createReadStream, existsSync, writeFileSync } from 'fs';
import {readFile } from 'fs/promises';
import { Promises } from 'vs/base/node/pfs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as cookie from 'cookie';
import * as crypto from 'crypto';
import { isEqualOrParent } from 'vs/base/common/extpath';
import { getMediaMime } from 'vs/base/common/mime';
import { isLinux } from 'vs/base/common/platform';
import { ILogService } from 'vs/platform/log/common/log';
import { IServerEnvironmentService } from 'vs/server/node/serverEnvironmentService';
import { extname, dirname, join, normalize } from 'vs/base/common/path';
import { FileAccess, connectionTokenCookieName, connectionTokenQueryName, Schemas, builtinExtensionsPath } from 'vs/base/common/network';
import { generateUuid } from 'vs/base/common/uuid';
import { IProductService } from 'vs/platform/product/common/productService';
import { ServerConnectionToken, ServerConnectionTokenType } from 'vs/server/node/serverConnectionToken';
import { asTextOrError, IRequestService } from 'vs/platform/request/common/request';
import { IHeaders } from 'vs/base/parts/request/common/request';
import { CancellationToken } from 'vs/base/common/cancellation';
import { URI } from 'vs/base/common/uri';
import { streamToBuffer } from 'vs/base/common/buffer';
import { IProductConfiguration } from 'vs/base/common/product';
import { isString } from 'vs/base/common/types';
import { getLocaleFromConfig, getNLSConfiguration } from 'vs/server/node/remoteLanguagePacks';
import { CharCode } from 'vs/base/common/charCode';
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions';

const textMimeType: { [ext: string]: string | undefined } = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
};

/**
 * Return an error to the client.
 */
export async function serveError(req: http.IncomingMessage, res: http.ServerResponse, errorCode: number, errorMessage: string): Promise<void> {
	res.writeHead(errorCode, { 'Content-Type': 'text/plain' });
	res.end(errorMessage);
}

export const enum CacheControl {
	NO_CACHING, ETAG, NO_EXPIRY
}

/**
 * Serve a file at a given path or 404 if the file is missing.
 */
export async function serveFile(filePath: string, cacheControl: CacheControl, logService: ILogService, req: http.IncomingMessage, res: http.ServerResponse, responseHeaders: Record<string, string>): Promise<void> {
	try {
		const stat = await Promises.stat(filePath); // throws an error if file doesn't exist
		if (cacheControl === CacheControl.ETAG) {

			// Check if file modified since
			const etag = `W/"${[stat.ino, stat.size, stat.mtime.getTime()].join('-')}"`; // weak validator (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
			if (req.headers['if-none-match'] === etag) {
				res.writeHead(304);
				return void res.end();
			}

			responseHeaders['Etag'] = etag;
		} else if (cacheControl === CacheControl.NO_EXPIRY) {
			responseHeaders['Cache-Control'] = 'public, max-age=31536000';
		} else if (cacheControl === CacheControl.NO_CACHING) {
			responseHeaders['Cache-Control'] = 'no-store';
		}

		responseHeaders['Content-Type'] = textMimeType[extname(filePath)] || getMediaMime(filePath) || 'text/plain';

		res.writeHead(200, responseHeaders);

		// Data
		createReadStream(filePath).pipe(res);
	} catch (error) {
		if (error.code !== 'ENOENT') {
			logService.error(error);
			console.error(error.toString());
		} else {
			console.error(`File not found: ${filePath}`);
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' });
		return void res.end('Not found');
	}
}

const APP_ROOT = dirname(FileAccess.asFileUri('').fsPath);

export class WebClientServer {

	private readonly _webExtensionResourceUrlTemplate: URI | undefined;

	private readonly _staticRoute: string;
	private readonly _callbackRoute: string;
	private readonly _webExtensionRoute: string;
	private readonly _idleRoute: string;

	constructor(
		private readonly _connectionToken: ServerConnectionToken,
		private readonly _basePath: string,
		readonly serverRootPath: string,
		@IServerEnvironmentService private readonly _environmentService: IServerEnvironmentService,
		@ILogService private readonly _logService: ILogService,
		@IRequestService private readonly _requestService: IRequestService,
		@IProductService private readonly _productService: IProductService,
	) {
		this._webExtensionResourceUrlTemplate = this._productService.extensionsGallery?.resourceUrlTemplate ? URI.parse(this._productService.extensionsGallery.resourceUrlTemplate) : undefined;

		this._staticRoute = `${serverRootPath}/static`;
		this._callbackRoute = `${serverRootPath}/callback`;
		this._webExtensionRoute = `${serverRootPath}/web-extension-resource`;
		this._idleRoute = '/api/idle';
	}

	/**
	 * Handle web resources (i.e. only needed by the web client).
	 * **NOTE**: This method is only invoked when the server has web bits.
	 * **NOTE**: This method is only invoked after the connection token has been validated.
	 */
	async handle(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
		try {
			const pathname = parsedUrl.pathname!;

			if (pathname.startsWith(this._staticRoute) && pathname.charCodeAt(this._staticRoute.length) === CharCode.Slash) {
				return this._handleStatic(req, res, parsedUrl);
			}
			if (pathname === this._basePath) {
				return this._handleRoot(req, res, parsedUrl);
			}
			if (pathname === this._idleRoute) {
				return this._handleIdle(req, res);
			}
			if (pathname === this._callbackRoute) {
				// callback support
				return this._handleCallback(res);
			}
			if (pathname.startsWith(this._webExtensionRoute) && pathname.charCodeAt(this._webExtensionRoute.length) === CharCode.Slash) {
				// extension resource support
				return this._handleWebExtensionResource(req, res, parsedUrl);
			}

			return serveError(req, res, 404, 'Not found.');
		} catch (error) {
			this._logService.error(error);
			console.error(error.toString());

			return serveError(req, res, 500, 'Internal Server Error.');
		}
	}
	/**
	 * Handle HTTP requests for /static/*
	 */
	private async _handleStatic(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
		const headers: Record<string, string> = Object.create(null);

		// Strip the this._staticRoute from the path
		const normalizedPathname = decodeURIComponent(parsedUrl.pathname!); // support paths that are uri-encoded (e.g. spaces => %20)
		const relativeFilePath = normalizedPathname.substring(this._staticRoute.length + 1);

		const filePath = join(APP_ROOT, relativeFilePath); // join also normalizes the path
		if (!isEqualOrParent(filePath, APP_ROOT, !isLinux)) {
			return serveError(req, res, 400, `Bad request.`);
		}

		return serveFile(filePath, this._environmentService.isBuilt ? CacheControl.NO_EXPIRY : CacheControl.ETAG, this._logService, req, res, headers);
	}

	private _getResourceURLTemplateAuthority(uri: URI): string | undefined {
		const index = uri.authority.indexOf('.');
		return index !== -1 ? uri.authority.substring(index + 1) : undefined;
	}

	/**
	 * Handle extension resources
	 */
	private async _handleWebExtensionResource(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
		if (!this._webExtensionResourceUrlTemplate) {
			return serveError(req, res, 500, 'No extension gallery service configured.');
		}

		// Strip `/web-extension-resource/` from the path
		const normalizedPathname = decodeURIComponent(parsedUrl.pathname!); // support paths that are uri-encoded (e.g. spaces => %20)
		const path = normalize(normalizedPathname.substring(this._webExtensionRoute.length + 1));
		const uri = URI.parse(path).with({
			scheme: this._webExtensionResourceUrlTemplate.scheme,
			authority: path.substring(0, path.indexOf('/')),
			path: path.substring(path.indexOf('/') + 1)
		});

		if (this._getResourceURLTemplateAuthority(this._webExtensionResourceUrlTemplate) !== this._getResourceURLTemplateAuthority(uri)) {
			return serveError(req, res, 403, 'Request Forbidden');
		}

		const headers: IHeaders = {};
		const setRequestHeader = (header: string) => {
			const value = req.headers[header];
			if (value && (isString(value) || value[0])) {
				headers[header] = isString(value) ? value : value[0];
			} else if (header !== header.toLowerCase()) {
				setRequestHeader(header.toLowerCase());
			}
		};
		setRequestHeader('X-Client-Name');
		setRequestHeader('X-Client-Version');
		setRequestHeader('X-Machine-Id');
		setRequestHeader('X-Client-Commit');

		const context = await this._requestService.request({
			type: 'GET',
			url: uri.toString(true),
			headers
		}, CancellationToken.None);

		const status = context.res.statusCode || 500;
		if (status !== 200) {
			let text: string | null = null;
			try {
				text = await asTextOrError(context);
			} catch (error) {/* Ignore */ }
			return serveError(req, res, status, text || `Request failed with status ${status}`);
		}

		const responseHeaders: Record<string, string> = Object.create(null);
		const setResponseHeader = (header: string) => {
			const value = context.res.headers[header];
			if (value) {
				responseHeaders[header] = value;
			} else if (header !== header.toLowerCase()) {
				setResponseHeader(header.toLowerCase());
			}
		};
		setResponseHeader('Cache-Control');
		setResponseHeader('Content-Type');
		res.writeHead(200, responseHeaders);
		const buffer = await streamToBuffer(context.stream);
		return void res.end(buffer.buffer);
	}

	/**
	 * Handle HTTP requests for /
	 */
	private async _handleRoot(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {

		const queryConnectionToken = parsedUrl.query[connectionTokenQueryName];
		if (typeof queryConnectionToken === 'string') {
			// We got a connection token as a query parameter.
			// We want to have a clean URL, so we strip it
			const responseHeaders: Record<string, string> = Object.create(null);
			responseHeaders['Set-Cookie'] = cookie.serialize(
				connectionTokenCookieName,
				queryConnectionToken,
				{
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 /* 1 week */
				}
			);

			const newQuery = Object.create(null);
			for (const key in parsedUrl.query) {
				if (key !== connectionTokenQueryName) {
					newQuery[key] = parsedUrl.query[key];
				}
			}
			const newLocation = url.format({ pathname: parsedUrl.pathname, query: newQuery });
			responseHeaders['Location'] = newLocation;

			res.writeHead(302, responseHeaders);
			return void res.end();
		}

		const getFirstHeader = (headerName: string) => {
			const val = req.headers[headerName];
			return Array.isArray(val) ? val[0] : val;
		};

		const useTestResolver = (!this._environmentService.isBuilt && this._environmentService.args['use-test-resolver']);
		const remoteAuthority = (
			useTestResolver
				? 'test+test'
				: (getFirstHeader('x-original-host') || getFirstHeader('x-forwarded-host') || req.headers.host || window.location.host)
		);
		if (!remoteAuthority) {
			return serveError(req, res, 400, `Bad request.`);
		}

		function asJSON(value: unknown): string {
			return JSON.stringify(value).replace(/"/g, '&quot;');
		}

		let _wrapWebWorkerExtHostInIframe: undefined | false = undefined;
		if (this._environmentService.args['enable-smoke-test-driver']) {
			// integration tests run at a time when the built output is not yet published to the CDN
			// so we must disable the iframe wrapping because the iframe URL will give a 404
			_wrapWebWorkerExtHostInIframe = false;
		}

		const resolveWorkspaceURI = (defaultLocation?: string) => defaultLocation && URI.file(path.resolve(defaultLocation)).with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });

		const filePath = FileAccess.asFileUri(this._environmentService.isBuilt ? 'vs/code/browser/workbench/workbench.html' : 'vs/code/browser/workbench/workbench-dev.html').fsPath;
		const authSessionInfo = !this._environmentService.isBuilt && this._environmentService.args['github-auth'] ? {
			id: generateUuid(),
			providerId: 'github',
			accessToken: this._environmentService.args['github-auth'],
			scopes: [['user:email'], ['repo']]
		} : undefined;

		const basePath: string = this._environmentService.args['base-path'] || "/"
		const base = relativeRoot(basePath)
		const vscodeBase = relativePath(basePath)

		const productConfiguration = {
			rootEndpoint: base,
			embedderIdentifier: 'server-distro',
			extensionsGallery: this._webExtensionResourceUrlTemplate && this._productService.extensionsGallery ? {
				...this._productService.extensionsGallery,
				resourceUrlTemplate: this._webExtensionResourceUrlTemplate.with({
					scheme: 'http',
					authority: remoteAuthority,
					path: `${this._webExtensionRoute}/${this._webExtensionResourceUrlTemplate.authority}${this._webExtensionResourceUrlTemplate.path}`
				}).toString(true)
			} : undefined
		} satisfies Partial<IProductConfiguration>;

		if (!this._environmentService.isBuilt) {
			try {
				const productOverrides = JSON.parse((await Promises.readFile(join(APP_ROOT, 'product.overrides.json'))).toString());
				Object.assign(productConfiguration, productOverrides);
			} catch (err) {/* Ignore Error */ }
		}

		const workbenchWebConfiguration = {
			remoteAuthority,
			serverBasePath: this._basePath,
			webviewEndpoint: vscodeBase + this._staticRoute + '/out/vs/workbench/contrib/webview/browser/pre',
			userDataPath: this._environmentService.userDataPath,
			_wrapWebWorkerExtHostInIframe,
			developmentOptions: { enableSmokeTestDriver: this._environmentService.args['enable-smoke-test-driver'] ? true : undefined, logLevel: this._logService.getLevel() },
			settingsSyncOptions: !this._environmentService.isBuilt && this._environmentService.args['enable-sync'] ? { enabled: true } : undefined,
			enableWorkspaceTrust: !this._environmentService.args['disable-workspace-trust'],
			folderUri: resolveWorkspaceURI(this._environmentService.args['default-folder']),
			workspaceUri: resolveWorkspaceURI(this._environmentService.args['default-workspace']),
			productConfiguration,
			callbackRoute: this._callbackRoute
		};

		const locale = this._environmentService.args.locale || await getLocaleFromConfig(this._environmentService.argvResource.fsPath);
		const nlsConfiguration = await getNLSConfiguration(locale, this._environmentService.userDataPath)
		const nlsBaseUrl = this._productService.extensionsGallery?.nlsBaseUrl;
		const values: { [key: string]: string } = {
			WORKBENCH_WEB_CONFIGURATION: asJSON(workbenchWebConfiguration),
			WORKBENCH_AUTH_SESSION: authSessionInfo ? asJSON(authSessionInfo) : '',
			WORKBENCH_WEB_BASE_URL: vscodeBase + this._staticRoute,
			WORKBENCH_NLS_BASE_URL: vscodeBase + (nlsBaseUrl ? `${nlsBaseUrl}${!nlsBaseUrl.endsWith('/') ? '/' : ''}${this._productService.commit}/${this._productService.version}/` : ''),
			BASE: base,
			VS_BASE: vscodeBase,
			NLS_CONFIGURATION: asJSON(nlsConfiguration),
		};

		if (useTestResolver) {
			const bundledExtensions: { extensionPath: string; packageJSON: IExtensionManifest }[] = [];
			for (const extensionPath of ['vscode-test-resolver', 'github-authentication']) {
				const packageJSON = JSON.parse((await Promises.readFile(FileAccess.asFileUri(`${builtinExtensionsPath}/${extensionPath}/package.json`).fsPath)).toString());
				bundledExtensions.push({ extensionPath, packageJSON });
			}
			values['WORKBENCH_BUILTIN_EXTENSIONS'] = asJSON(bundledExtensions);
		}

		let data;
		try {
			const workbenchTemplate = (await Promises.readFile(filePath)).toString();
			data = workbenchTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? 'undefined');
		} catch (e) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			return void res.end('Not found');
		}

		const webWorkerExtensionHostIframeScriptSHA = 'sha256-75NYUUvf+5++1WbfCZOV3PSWxBhONpaxwx+mkOFRv/Y=';

		const cspDirectives = [
			'default-src \'self\';',
			'img-src \'self\' https: data: blob:;',
			'media-src \'self\';',
			`script-src 'self' 'unsafe-eval' ${this._getScriptCspHashes(data).join(' ')} '${webWorkerExtensionHostIframeScriptSHA}' ${useTestResolver ? '' : `http://${remoteAuthority}`};`, // the sha is the same as in src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html
			'child-src \'self\';',
			`frame-src 'self' https://*.vscode-cdn.net data:;`,
			'worker-src \'self\' data: blob:;',
			'style-src \'self\' \'unsafe-inline\';',
		        'connect-src \'self\' ws: wss: https://main.vscode-cdn.net http://localhost:* https://localhost:* https://login.microsoftonline.com/ https://update.code.visualstudio.com https://*.vscode-unpkg.net/ https://default.exp-tas.com/vscode/ab https://vscode-sync.trafficmanager.net https://vscode-sync-insiders.trafficmanager.net https://*.gallerycdn.vsassets.io https://marketplace.visualstudio.com https://*.blob.core.windows.net https://az764295.vo.msecnd.net  https://code.visualstudio.com https://*.gallery.vsassets.io https://*.rel.tunnels.api.visualstudio.com wss://*.rel.tunnels.api.visualstudio.com https://*.servicebus.windows.net/ https://vscode.blob.core.windows.net https://vscode.search.windows.net https://vsmarketplacebadges.dev https://vscode.download.prss.microsoft.com https://download.visualstudio.microsoft.com https://*.vscode-unpkg.net https://open-vsx.org;',	
			'font-src \'self\' blob:;',
			'manifest-src \'self\';'
		].join(' ');

		const headers: http.OutgoingHttpHeaders = {
			'Content-Type': 'text/html',
			'Content-Security-Policy': cspDirectives
		};
		if (this._connectionToken.type !== ServerConnectionTokenType.None) {
			// At this point we know the client has a valid cookie
			// and we want to set it prolong it to ensure that this
			// client is valid for another 1 week at least
			headers['Set-Cookie'] = cookie.serialize(
				connectionTokenCookieName,
				this._connectionToken.value,
				{
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 /* 1 week */
				}
			);
		}

		res.writeHead(200, headers);
		return void res.end(data);
	}

	private _getScriptCspHashes(content: string): string[] {
		// Compute the CSP hashes for line scripts. Uses regex
		// which means it isn't 100% good.
		const regex = /<script>([\s\S]+?)<\/script>/img;
		const result: string[] = [];
		let match: RegExpExecArray | null;
		while (match = regex.exec(content)) {
			const hasher = crypto.createHash('sha256');
			// This only works on Windows if we strip `\r` from `\r\n`.
			const script = match[1].replace(/\r\n/g, '\n');
			const hash = hasher
				.update(Buffer.from(script))
				.digest().toString('base64');

			result.push(`'sha256-${hash}'`);
		}
		return result;
	}

	/**
	 * Handle HTTP requests for /callback
	 */
	private async _handleCallback(res: http.ServerResponse): Promise<void> {
		const filePath = FileAccess.asFileUri('vs/code/browser/workbench/callback.html').fsPath;
		const data = (await Promises.readFile(filePath)).toString();
		const cspDirectives = [
			'default-src \'self\';',
			'img-src \'self\' https: data: blob:;',
			'media-src \'none\';',
			`script-src 'self' ${this._getScriptCspHashes(data).join(' ')};`,
			'style-src \'self\' \'unsafe-inline\';',
			'font-src \'self\' blob:;'
		].join(' ');

		res.writeHead(200, {
			'Content-Type': 'text/html',
			'Content-Security-Policy': cspDirectives
		});
		return void res.end(data);
	}

	/**
 	 * Handles API requests to retrieve the last activity timestamp.
   */
	private async _handleIdle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		try {
			const tmpDirectory = '/tmp/'
			const idleFilePath = path.join(tmpDirectory, '.sagemaker-last-active-timestamp');

			// If idle shutdown file does not exist, this indicates the app UI may never been opened
			// Create the initial metadata file
			if (!existsSync(idleFilePath)) {
				const timestamp = new Date().toISOString();
				writeFileSync(idleFilePath, timestamp);
			}

			const data = await readFile(idleFilePath, 'utf8');

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ lastActiveTimestamp: data }));
		} catch (error) {
			serveError(req, res, 500, error.message)
		}
	}
}

/**
 * Remove extra slashes in a URL.
 *
 * This is meant to fill the job of `path.join` so you can concatenate paths and
 * then normalize out any extra slashes.
 *
 * If you are using `path.join` you do not need this but note that `path` is for
 * file system paths, not URLs.
 */
export const normalizeUrlPath = (url: string, keepTrailing = false): string => {
	return url.replace(/\/\/+/g, "/").replace(/\/+$/, keepTrailing ? "/" : "")
}

/**
 * Get the relative path that will get us to the root of the page. For each
 * slash we need to go up a directory.  Will not have a trailing slash.
 *
 * For example:
 *
 * / => .
 * /foo => .
 * /foo/ => ./..
 * /foo/bar => ./..
 * /foo/bar/ => ./../..
 *
 * All paths must be relative in order to work behind a reverse proxy since we
 * we do not know the base path.  Anything that needs to be absolute (for
 * example cookies) must get the base path from the frontend.
 *
 * All relative paths must be prefixed with the relative root to ensure they
 * work no matter the depth at which they happen to appear.
 *
 * For Express `req.originalUrl` should be used as they remove the base from the
 * standard `url` property making it impossible to get the true depth.
 */
export const relativeRoot = (originalUrl: string): string => {
	const depth = (originalUrl.split("?", 1)[0].match(/\//g) || []).length
	return normalizeUrlPath("./" + (depth > 1 ? "../".repeat(depth - 1) : ""))
}

/**
 * Get the relative path to the current resource.
 *
 * For example:
 *
 * / => .
 * /foo => ./foo
 * /foo/ => .
 * /foo/bar => ./bar
 * /foo/bar/ => .
 */
export const relativePath = (originalUrl: string): string => {
	const parts = originalUrl.split("?", 1)[0].split("/")
	return normalizeUrlPath("./" + parts[parts.length - 1])
}

/**
 * code-server serves Code using Express.  Express removes the base from the url
 * and puts the original in `originalUrl` so we must use this to get the correct
 * depth.  Code is not aware it is behind Express so the types do not match.  We
 * may want to continue moving code into Code and eventually remove the Express
 * wrapper or move the web server back into code-server.
 */
export const getOriginalUrl = (req: http.IncomingMessage): string => {
	return (req as any).originalUrl || req.url
}
