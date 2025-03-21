import React, { useState, useEffect, createContext } from 'react';
import { styled } from '@mui/material/styles';
import SideNavigation from './components/SideNavigation';
import SectionContent from './components/SectionContent';
import { SectionForms, LibraryConfig, FormField, FormType } from './types/types';
import { getFormTypeForSection, mapJsonDataToForms } from './utils/utils';

const Root = styled('div')({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: 'var(--vscode-editor-background)',
  color: 'var(--vscode-editor-foreground)',
});

declare global {
  interface Window {
    initialData: LibraryConfig;
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi();

const LibraryManagement: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('Jar - Maven Artifacts');
  const [sectionForms, setSectionForms] = useState<SectionForms>({});
  const [applyToCodeEditor, setApplyToCodeEditor] = useState<boolean>(false);
  const [hasInvalidPaths, setHasInvalidPaths] = useState<boolean>(false);
  const [jsonData, setJsonData] = useState<any>(null);

  // Initialize forms from window.initialData
  useEffect(() => {
    if (window.initialData) {
      const mappedForms = mapJsonDataToForms(window.initialData);
      setSectionForms(mappedForms);
      setApplyToCodeEditor(window.initialData.ApplyChangeToSpace);
    }
  }, []);

  const getSectionDataPath = (sectionId: string): { category: string; section: string } => {
    const [category, ...sectionParts] = sectionId.split(' - ');
    const section = sectionParts.join(' - ')
      .replace('Maven Artifacts', 'MavenArtifacts')
      .replace('S3 Paths', 'S3Paths')
      .replace('Disk Location Paths', 'LocalPaths')
      .replace('Other Paths', 'OtherPaths')
      .replace('PyPI Packages', 'PyPIPackages');
    
    return {
      category: category === 'Jar' ? 'Jar' : 'Python',
      section: section
    };
  };

  useEffect(() => {
    if (!jsonData || !selectedSection) return;
  
    const { category, section } = getSectionDataPath(selectedSection);
    let sectionData: FormField[] = [];
  
    if (category === 'Python' && section === 'CondaPackages') {
      // Special handling for Conda Packages which has Channels and PackageSpecs
      sectionData = [
        ...(jsonData.Python.CondaPackages.Channels.map((value: string) => 
          ({id: `form-${Date.now()}-${Math.random()}`, value: value, type: FormType.channel})) || []),
        ...(jsonData.Python.CondaPackages.PackageSpecs.map((value:string) => 
          ({id: `form-${Date.now()}-${Math.random()}`, value: value, type: FormType.channel})) || [])
      ];
    } else {
      // Regular section data
      sectionData = jsonData[category][section].map((value: string) => 
        ({id: `form-${Date.now()}-${Math.random()}`, value: value, type: getFormTypeForSection(selectedSection)})) || [];
    }
  
    setSectionForms(prev => ({
      ...prev,
      [selectedSection]: sectionData
    }));
  }, [selectedSection, jsonData]);

  const handleSave = () => {
    const configData: LibraryConfig = {
      ApplyChangeToSpace: applyToCodeEditor,
      Jar: {
        MavenArtifacts: sectionForms['Jar - Maven Artifacts']?.map(f => f.value) || [],
        S3Paths: sectionForms['Jar - S3 Paths']?.map(f => f.value) || [],
        LocalPaths: sectionForms['Jar - Disk Location Paths']?.map(f => f.value) || [],
        OtherPaths: sectionForms['Jar - Other Paths']?.map(f => f.value) || []
      },
      Python: {
        CondaPackages: {
          Channels: sectionForms['Python - Conda Packages']
            ?.filter(f => f.type === FormType.channel)
            ?.map(f => f.value) || [],
          PackageSpecs: sectionForms['Python - Conda Packages']
            ?.filter(f => f.type === FormType.spec)
            ?.map(f => f.value) || []
        },
        PyPIPackages: sectionForms['Python - PyPI Packages']?.map(f => f.value) || [],
        S3Paths: sectionForms['Python - S3 Paths']?.map(f => f.value) || [],
        LocalPaths: sectionForms['Python - Disk Location Paths']?.map(f => f.value) || [],
        OtherPaths: sectionForms['Python - Other Paths']?.map(f => f.value) || []
      }
    };

    vscode.postMessage({
      command: 'saveConfig',
      data: configData
    });
  };

  return (
    <Root>
      <SideNavigation
        selectedSection={selectedSection}
        onSectionSelect={setSelectedSection}
        applyToCodeEditor={applyToCodeEditor}
        setApplyToCodeEditor={setApplyToCodeEditor}
        hasInvalidPaths={hasInvalidPaths}
        onSave={handleSave}
      />
      <SectionContent
        selectedSection={selectedSection}
        sectionForms={sectionForms}
        setSectionForms={setSectionForms}
        setHasInvalidPaths={setHasInvalidPaths}
      />
    </Root>
  );
};

export default LibraryManagement;
