import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import './test-framework';

const PATCHED_VSCODE_DIR = join(process.cwd(), 'patched-vscode');

describe('display-language.patch validation', () => {
  test('platform.ts should have NLS modifications', () => {
    const filePath = join(PATCHED_VSCODE_DIR, 'src/vs/base/common/platform.ts');
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = readFileSync(filePath, 'utf8');
    
    // Check for NLSConfig interface
    const nlsConfigInterface = "interface NLSConfig {\n\tlocale: string;\n\tosLocale: string;\n\tavailableLanguages: { [key: string]: string };\n\t_translationsConfigFile: string;\n}";
    if (!content.includes(nlsConfigInterface)) {
      throw new Error(`Expected NLSConfig interface not found in ${filePath}`);
    }
    
    // Check that nls import is removed (should not be present)
    const nlsImport = "import * as nls from '../../nls.js';";
    if (content.includes(nlsImport)) {
      throw new Error(`NLS import should be removed from ${filePath}`);
    }

    // Check for modified NLS config parsing
    const nlsConfigParsing = "const nlsConfig: NLSConfig = JSON.parse(rawNlsConfig);";
    if (!content.includes(nlsConfigParsing)) {
      throw new Error(`Expected NLSConfig parsing not found in ${filePath}`);
    }

    // Check for resolved language logic
    const resolvedLanguage = "const resolved = nlsConfig.availableLanguages['*'];";
    if (!content.includes(resolvedLanguage)) {
      throw new Error(`Expected resolved language logic not found in ${filePath}`);
    }

    // Check for locale assignment changes
    const localeAssignment = "_locale = nlsConfig.locale;";
    if (!content.includes(localeAssignment)) {
      throw new Error(`Expected locale assignment not found in ${filePath}`);
    }
    
    console.log('PASS: Display language modifications found in platform.ts');
  });
});
