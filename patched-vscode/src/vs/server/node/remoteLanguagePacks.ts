/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import { FileAccess } from 'vs/base/common/network';
import * as path from 'vs/base/common/path';

import * as lp from 'vs/base/node/languagePacks';

const metaData = path.join(FileAccess.asFileUri('').fsPath, 'nls.metadata.json');
const _cache: Map<string, Promise<lp.NLSConfiguration>> = new Map();

export function getNLSConfiguration(language: string, userDataPath: string): Promise<lp.NLSConfiguration> {
	const key = `${language}||${userDataPath}`;
	let result = _cache.get(key);
	if (!result) {
		// The OS Locale on the remote side really doesn't matter, so we pass in the same language
		result = lp.getNLSConfiguration("dummy_commmit", userDataPath, metaData, language, language).then(value => {
			if (InternalNLSConfiguration.is(value)) {
				value._languagePackSupport = true;
			}
			// If the configuration has no results keep trying since code-server
			// doesn't restart when a language is installed so this result would
			// persist (the plugin might not be installed yet for example).
			if (value.locale !== 'en' && value.locale !== 'en-us' && Object.keys(value.availableLanguages).length === 0) {
				_cache.delete(key);
			}
			return value;
		});
		_cache.set(key, result);
	}
	return result;
}

export namespace InternalNLSConfiguration {
	export function is(value: lp.NLSConfiguration): value is lp.InternalNLSConfiguration {
		const candidate: lp.InternalNLSConfiguration = value as lp.InternalNLSConfiguration;
		return candidate && typeof candidate._languagePackId === 'string';
	}
}

/**
 * The code below is copied from from src/main.js.
 */

export const getLocaleFromConfig = async (argvResource: string): Promise<string> => {
	try {
		const content = stripComments(await fs.promises.readFile(argvResource, 'utf8'));
		return JSON.parse(content).locale;
	} catch (error) {
		if (error.code !== "ENOENT") {
			console.warn(error)
		}
		return 'en';
	}
};

const stripComments = (content: string): string => {
	const regexp = /('(?:[^\\']*(?:\\.)?)*')|('(?:[^\\']*(?:\\.)?)*')|(\/\*(?:\r?\n|.)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))/g;

	return content.replace(regexp, (match, _m1, _m2, m3, m4) => {
		// Only one of m1, m2, m3, m4 matches
		if (m3) {
			// A block comment. Replace with nothing
			return '';
		} else if (m4) {
			// A line comment. If it ends in \r?\n then keep it.
			const length_1 = m4.length;
			if (length_1 > 2 && m4[length_1 - 1] === '\n') {
				return m4[length_1 - 2] === '\r' ? '\r\n' : '\n';
			}
			else {
				return '';
			}
		} else {
			// We match a string
			return match;
		}
	});
};
