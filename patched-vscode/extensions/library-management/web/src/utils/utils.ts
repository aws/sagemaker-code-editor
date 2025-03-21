import { LibraryConfig, SectionForms, FormField, FormType } from '../types/types';

export const mapJsonDataToForms = (jsonData: LibraryConfig): SectionForms => {
    const createFormFields = (values: string[], type: FormType): FormField[] => {
      return values.map(value => ({
        id: `form-${Date.now()}-${Math.random()}`,
        value,
        type
      }));
    };

    return {
      'Jar - Maven Artifacts': createFormFields(jsonData.Jar.MavenArtifacts, FormType.maven),
      'Jar - S3 Paths': createFormFields(jsonData.Jar.S3Paths, FormType.jars3),
      'Jar - Disk Location Paths': createFormFields(jsonData.Jar.LocalPaths, FormType.jardisk),
      'Jar - Other Paths': createFormFields(jsonData.Jar.OtherPaths, FormType.jarother),
      'Python - Conda Packages': [
        ...createFormFields(jsonData.Python.CondaPackages.Channels, FormType.channel),
        ...createFormFields(jsonData.Python.CondaPackages.PackageSpecs, FormType.spec)
      ],
      'Python - PyPI Packages': createFormFields(jsonData.Python.PyPIPackages, FormType.pypi),
      'Python - S3 Paths': createFormFields(jsonData.Python.S3Paths, FormType.pys3),
      'Python - Disk Location Paths': createFormFields(jsonData.Python.LocalPaths, FormType.pydisk),
      'Python - Other Paths': createFormFields(jsonData.Python.OtherPaths, FormType.pyother)
    };
};

export const getPlaceholderText = (section: string): string => {
    switch (section) {
      case 'Jar - Maven Artifacts':
        return 'groupId:artifactId:version';
      case 'Jar - S3 Paths':
        return 's3://bucket-name/path/to/file.jar';
      case 'Jar - Disk Location Paths':
        return 'file:/path/to/file.jar';
      case 'Jar - Other Paths':
        return 'http://domain.com/path/to/file.jar';
      case 'Python - Conda Packages':
        return 'package_name>=1.0.0';
      case 'Python - PyPI Packages':
        return 'package_name==1.0.0';
      case 'Python - S3 Paths':
        return 's3://bucket-name/path/to/file.whl';
      case 'Python - Disk Location Paths':
        return 'file:/path/to/file.whl';
      case 'Python - Other Paths':
        return 'http://domain.com/path/to/file.whl';
      default:
        return '';
    }
  };

  export const getFormTypeForSection = (selectedSection: string): FormType => {
    switch (selectedSection) {
      case 'Jar - Maven Artifacts':
        return FormType.maven;
      case 'Jar - S3 Paths':
        return FormType.jars3;
      case 'Jar - Disk Location Paths':
        return FormType.jardisk;
      case 'Jar - Other Paths':
        return FormType.jarother;
      case 'Python - PyPI Packages':
        return FormType.pypi;
      case 'Python - S3 Paths':
        return FormType.pys3;
      case 'Python - Disk Location Paths':
        return FormType.pydisk;
      case 'Python - Other Paths':
        return FormType.pyother;
      default:
        throw new Error(`Unknown section: ${selectedSection}`);
    }
  }