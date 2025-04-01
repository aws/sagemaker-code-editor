import * as path from 'path';
import * as testRunner from '../../../../test/integration/electron/testrunner';

const options: import('mocha').MochaOptions = {
    ui: 'tdd',
    color: true,
    timeout: 60000
};

// Set the suite name
let suite = '';
if (process.env.VSCODE_BROWSER) {
    suite = `${process.env.VSCODE_BROWSER} Browser Integration SageMaker UI Dark Theme Tests`;
} else if (process.env.REMOTE_VSCODE) {
    suite = 'Remote Integration SageMaker UI Dark Theme Tests';
} else {
    suite = 'Integration SageMaker UI Dark Theme Tests';
}

if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
    options.reporter = 'mocha-multi-reporters';
    options.reporterOptions = {
        reporterEnabled: 'spec, mocha-junit-reporter',
        mochaJunitReporterReporterOptions: {
            testsuitesTitle: `${suite} ${process.platform}`,
            mochaFile: path.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/${process.platform}-${process.arch}-${suite.toLowerCase().replace(/[^\w]/g, '-')}-results.xml`)
        }
    };
}

testRunner.configure(options);

export = testRunner;
