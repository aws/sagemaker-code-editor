export interface Compute {
    name: string;
    description: string;
  }
  
  export interface SectionConfig {
    title: string;
    computes: string[];
    formatInfo: string;
    moreInfo: string;
    type: string;
    type1?: string;
    type2?: string;
    regex: RegExp;
  }
  
  export interface NavigationItem {
    id: string;
    label: string;
  }
  
  export interface NavigationCategory {
    [key: string]: NavigationItem[];
  }
  
  export interface SectionConfigs {
    [key: string]: SectionConfig;
  }
  
  export enum FormType {
    'maven',
    'jars3',
    'jardisk',
    'jarother',
    'channel',
    'spec',
    'pypi',
    'pys3',
    'pydisk',
    'pyother'
  }

  export interface FormField {
    id: string;
    value: string;
    type: FormType;
  }
  
  export interface SectionForms {
    [sectionId: string]: FormField[];
  }

  export interface ValidationResult {
    isValid: boolean;
    errorMessage: string;
  }

  export interface LibraryConfig {
    ApplyChangeToSpace: boolean;
    Jar: {
      MavenArtifacts: string[];
      S3Paths: string[];
      LocalPaths: string[];
      OtherPaths: string[];
    };
    Python: {
      CondaPackages: {
        Channels: string[];
        PackageSpecs: string[];
      };
      PyPIPackages: string[];
      S3Paths: string[];
      LocalPaths: string[];
      OtherPaths: string[];
    };
  }