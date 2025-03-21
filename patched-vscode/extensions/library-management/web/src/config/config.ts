// config.ts

import { NavigationCategory, SectionConfigs } from '../types/types';

const S3_PREFIX_REGEX = '^s3://.*';
const LOCAL_PREFIX_REGEX = '^(file:/|local:/).*';
const OTHER_PREFIX_REGEX = '^(hdfs://|http://|https://|ftp://).*';
const JAR_SUFFIX_REGEX = '(.jar)$';
const PYTHON_SUFFIX_REGEX = '(.py|.zip|.egg|.whl)$';

export const navigationStructure: NavigationCategory = {
  JAR: [
    { id: 'Jar - Maven Artifacts', label: 'Maven Artifacts' },
    { id: 'Jar - S3 Paths', label: 'S3 Paths' },
    { id: 'Jar - Disk Location Paths', label: 'Disk Location Paths' },
    { id: 'Jar - Other Paths', label: 'Other Paths' }
  ],
  PYTHON: [
    { id: 'Python - Conda Packages', label: 'Conda Packages' },
    { id: 'Python - PyPI Packages', label: 'PyPI Packages' },
    { id: 'Python - S3 Paths', label: 'S3 Paths' },
    { id: 'Python - Disk Location Paths', label: 'Disk Location Paths' },
    { id: 'Python - Other Paths', label: 'Other Paths' }
  ]
};

export const sectionConfigs: SectionConfigs = {
  'Jar - Maven Artifacts': {
    title: 'Jar - Maven Artifacts',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS EMR Serverless - Spark compute platform provided by Amazon EMR Serverless'
    ],
    formatInfo: 'Provide the Maven coordinates in the following format: groupId:artifactId:version',
    moreInfo: 'For more information on Maven coordinates, see Spark Configuration',
    type: 'Maven Artifacts',
    regex: new RegExp('^([\\w\\.\\-]+):([\\w\\.\\-]+):([\\w\\.\\-]+)$')
  },
  'Jar - S3 Paths': {
    title: 'Jar - S3 Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS EMR Serverless - Spark compute platform provided by Amazon EMR Serverless',
      'AWS Glue - Spark compute platform provided by AWS Glue'
    ],
    formatInfo: 'Provide URLs starting with "s3" for the JAR files',
    moreInfo: '',
    type: 'S3 Paths',
    regex: new RegExp(`${S3_PREFIX_REGEX}${JAR_SUFFIX_REGEX}`)
  },
  'Jar - Disk Location Paths': {
    title: 'Jar - Disk Location Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
    ],
    formatInfo: 'Provide URLs starting with "file" or "local" for the JAR files',
    moreInfo: 'To use a local path with EMR on EC2, configure the path in cluster configuration: livy-conf livy.file.local-dir-whitelist',
    type: 'Disk Location Paths',
    regex: new RegExp(`${LOCAL_PREFIX_REGEX}${JAR_SUFFIX_REGEX}`)
  },
  'Jar - Other Paths': {
    title: 'Jar - Other Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS EMR Serverless - Spark compute platform provided by Amazon EMR Serverless'
    ],
    formatInfo: 'Provide URLs to JAR files that begin with one of the following: "hdfs", "http", "https", or "ftp"',
    moreInfo: 'For more information on supported URLs, see Advanced Dependency Management',
    type: 'Other Paths',
    regex: new RegExp(`${OTHER_PREFIX_REGEX}${JAR_SUFFIX_REGEX}`)
  },
  'Python - Conda Packages': {
    title: 'Python - Conda Packages',
    computes: [
      'Code Editor environment provided by Amazon SageMaker',
    ],
    formatInfo: 'Provide the package specification supported by Conda',
    moreInfo: 'For more information on package specification, see Conda package specification',
    type: 'Conda Packages',
    type1: 'Channel',
    type2: 'Path Specs',
    regex: /.*/  // Allow any input for Conda packages
  },
  'Python - PyPI Packages': {
    title: 'Python - PyPI Packages',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS Glue - Spark compute platform provided by AWS Glue'
    ],
    formatInfo: 'Provide the requirement specifiers supported by pip\nTo use PyPI with EMR on EC2, provide the requirement specifiers in the format: packageName or packageName==version',
    moreInfo: 'For more information on supported requirement specifiers, see pip install\nWARNING: We do not recommend you to use pip in the CodeEditor environment. This could lead to an unstable environment.',
    type: 'PyPI Packages',
    regex: /.*/  // Allow any input for PyPI packages
  },
  'Python - S3 Paths': {
    title: 'Python - S3 Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS EMR Serverless - Spark compute platform provided by Amazon EMR Serverless',
      'AWS Glue - Spark compute platform provided by AWS Glue'
    ],
    formatInfo: 'Provide URLs for one of the following file types: py, zip, egg, whl. URL must begin with "s3".',
    moreInfo: '',
    type: 'S3 Paths',
    regex: new RegExp(`${S3_PREFIX_REGEX}${PYTHON_SUFFIX_REGEX}`)
  },
  'Python - Disk Location Paths': {
    title: 'Python - Disk Location Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR'
    ],
    formatInfo: 'Provide URLs for one of the following file types: py, zip, egg, whl. URL must begin with "file" or "local".',
    moreInfo: 'To use a local path with EMR on EC2, configure the path in cluster configuration: livy-conf livy.file.local-dir-whitelist',
    type: 'Disk Location Paths',
    regex: new RegExp(`${LOCAL_PREFIX_REGEX}${PYTHON_SUFFIX_REGEX}`)
  },
  'Python - Other Paths': {
    title: 'Python - Other Paths',
    computes: [
      'AWS EMR on EC2 - Spark compute platform provided by Amazon EMR',
      'AWS Glue - Spark compute platform provided by AWS Glue'
    ],
    formatInfo: 'Provide URLs for one of the following file types: py, zip, egg, whl. URL must begin with "hdfs", "http", "https", or "ftp".',
    moreInfo: 'For more information on supported URLs, see Advanced Dependency Management',
    type: 'Other Paths',
    regex: new RegExp(`${OTHER_PREFIX_REGEX}${PYTHON_SUFFIX_REGEX}`)
  }
};