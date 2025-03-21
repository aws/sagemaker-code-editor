import React from 'react';
import { Box, Typography } from '@mui/material';
import FormList from './FormList';
import { styled } from '@mui/material/styles';
import { sectionConfigs } from '../config/config';
import { SectionForms } from '../types/types';

const Main = styled('main')({
  flexGrow: 1,
  padding: '24px',
  backgroundColor: 'var(--vscode-editor-background)',
  color: 'var(--vscode-editor-foreground)',
});

interface SectionContentProps {
  selectedSection: string;
  sectionForms: SectionForms;
  setSectionForms: React.Dispatch<React.SetStateAction<SectionForms>>;
  setHasInvalidPaths: React.Dispatch<React.SetStateAction<boolean>>;
}

const SectionContent: React.FC<SectionContentProps> = ({
  selectedSection,
  sectionForms,
  setSectionForms,
  setHasInvalidPaths
}) => {
  const currentConfig = sectionConfigs[selectedSection];

  return (
    <Main>
      {currentConfig ? (
        <>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, color: 'var(--vscode-editor-foreground)' }}>
            {currentConfig.title}
          </Typography>

          <Box sx={{ 
            p: 2, 
            borderRadius: 1,
            mb: 3,
          }}>
            <Typography variant="body1" gutterBottom>
              Libraries in this configuration will be installed only for the following Computes:
            </Typography>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              {currentConfig.computes.map((compute, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>{compute}</li>
              ))}
            </ul>
            <Typography variant="body1">
              {currentConfig.formatInfo}
            </Typography>
            {currentConfig.moreInfo && (
              <Typography variant="body2">
                {currentConfig.moreInfo}
              </Typography>
            )}
          </Box>

          <FormList
            selectedSection={selectedSection}
            sectionForms={sectionForms}
            setSectionForms={setSectionForms}
            setHasInvalidPaths={setHasInvalidPaths}
          />
        </>
      ) : (
        <Typography variant="h6" color="error">
          Configuration not found for this section
        </Typography>
      )}
    </Main>
  );
};

export default SectionContent;
