import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { sectionConfigs } from '../config/config';
import { useFormHandling } from '../hooks/useFormHandling';
import { FormType, SectionForms } from '../types/types';
import { getFormTypeForSection } from '../utils/utils';

const FormContainer = styled(Box)({
    marginBottom: '16px',
    '& .MuiTextField-root': {
      backgroundColor: 'var(--vscode-input-background)',
      borderRadius: '4px',
      '& .MuiOutlinedInput-root': {
        color: 'var(--vscode-input-foreground)',
        '& fieldset': {
          borderColor: 'var(--vscode-input-border)',
        },
        '&:hover fieldset': {
          borderColor: 'var(--vscode-input-border)',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'var(--vscode-focusBorder)',
        },
        '&.Mui-error fieldset': {
          borderColor: 'var(--vscode-inputValidation-errorBorder)',
        },
      },
      '& .MuiFormHelperText-root': {
        color: 'var(--vscode-errorForeground)',
      },
    },
});

const ActionButton = styled('button')(({ color }) => ({
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '100px',
    '&:hover': {
      backgroundColor: 'var(--vscode-button-hoverBackground)',
    },
    '&:disabled': {
      backgroundColor: 'var(--vscode-button-secondaryBackground)',
      color: 'var(--vscode-button-secondaryForeground)',
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    '&.error': {
      backgroundColor: 'var(--vscode-errorForeground)',
      '&:hover': {
        backgroundColor: 'var(--vscode-errorForeground)',
        opacity: 0.8,
      },
    },
}));

interface FormListProps {
  selectedSection: string;
  sectionForms: SectionForms;
  setSectionForms: React.Dispatch<React.SetStateAction<SectionForms>>;
  setHasInvalidPaths: React.Dispatch<React.SetStateAction<boolean>>;
}

const FormList: React.FC<FormListProps> = ({
  selectedSection,
  sectionForms,
  setSectionForms,
  setHasInvalidPaths
}) => {
  const {
    handleAddForm,
    handleRemoveForm,
    handleFormChange,
    handleMoveForm,
    validateForm,
    getPlaceholderText
  } = useFormHandling(selectedSection, sectionForms, setSectionForms, setHasInvalidPaths);

  const currentConfig = sectionConfigs[selectedSection];
  const isCondaPackages = selectedSection === 'Python - Conda Packages';
  const currentForms = sectionForms[selectedSection] || [];

  if (isCondaPackages) {
    const channelForms = sectionForms[selectedSection]?.filter(f => f.type === FormType.channel) || [];
    const specForms = sectionForms[selectedSection]?.filter(f => f.type === FormType.spec) || [];

    return (
      <>
        {/* Channels Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {currentConfig.type1}
          </Typography>
          {channelForms.map((form, index) => (
            <FormContainer key={form.id}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  value={form.value}
                  onChange={(e) => handleFormChange(form.id, e.target.value, FormType.channel)}
                  error={form.value === '' || !validateForm(form.value, FormType.channel).isValid}
                  helperText={validateForm(form.value, FormType.channel).errorMessage}
                  size="small"
                  placeholder="conda-forge"
                />
                <ActionButton
                  onClick={() => handleMoveForm(form.id, 'up', FormType.channel)}
                  disabled={index === 0}
                >
                  Move up
                </ActionButton>
                <ActionButton
                  onClick={() => handleMoveForm(form.id, 'down', FormType.channel)}
                  disabled={index === channelForms.length - 1}
                >
                  Move down
                </ActionButton>
                <ActionButton
                  color="error"
                  onClick={() => handleRemoveForm(form.id)}
                >
                  Remove
                </ActionButton>
              </Box>
            </FormContainer>
          ))}
          <ActionButton onClick={() => handleAddForm(FormType.channel)}>
            Add
          </ActionButton>
        </Box>

        {/* Package Specs Section */}
        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {currentConfig.type2}
          </Typography>
          {specForms.map((form, index) => (
            <FormContainer key={form.id}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  value={form.value}
                  onChange={(e) => handleFormChange(form.id, e.target.value, FormType.spec)}
                  error={form.value === '' || !validateForm(form.value, FormType.spec).isValid}
                  helperText={validateForm(form.value, FormType.spec).errorMessage}
                  size="small"
                  placeholder="package>=1.0.0"
                />
                <ActionButton
                  onClick={() => handleMoveForm(form.id, 'up', FormType.spec)}
                  disabled={index === 0}
                >
                  Move up
                </ActionButton>
                <ActionButton
                  onClick={() => handleMoveForm(form.id, 'down', FormType.spec)}
                  disabled={index === specForms.length - 1}
                >
                  Move down
                </ActionButton>
                <ActionButton
                  color="error"
                  onClick={() => handleRemoveForm(form.id)}
                >
                  Remove
                </ActionButton>
              </Box>
            </FormContainer>
          ))}
          <ActionButton onClick={() => handleAddForm(FormType.spec)}>
            Add
          </ActionButton>
        </Box>
      </>
    );
  }

  // Regular sections
  return (
    <>
      {sectionForms[selectedSection]?.map((form, index) => (
        <FormContainer key={form.id}>
          <Box sx={{ 
                  display: 'flex', 
                  gap: 2,
                  alignItems: 'center' 
                }}>
                  <TextField
                    value={form.value}
                    onChange={(e) => handleFormChange(form.id, e.target.value, form.type)}
                    error={form.value === '' || form.value !== '' && !validateForm(form.value, form.type).isValid}
                    helperText={
                      form.value !== '' 
                        ? validateForm(form.value, form.type).errorMessage 
                        : validateForm('', form.type).errorMessage
                    }
                    size="small"
                    placeholder={getPlaceholderText(selectedSection)}
                  />
                  <ActionButton
                    onClick={() => handleMoveForm(form.id, 'up', form.type)}
                    disabled={index === 0}
                  >
                    Move up
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleMoveForm(form.id, 'down', form.type)}
                    disabled={index === currentForms.length - 1}
                  >
                    Move down
                  </ActionButton>
                  <ActionButton
                    color="error"
                    onClick={() => handleRemoveForm(form.id)}
                  >
                    Remove
                  </ActionButton>
                </Box>
        </FormContainer>
      ))}
      <ActionButton onClick={() => handleAddForm(getFormTypeForSection(selectedSection))}>
        Add
      </ActionButton>
    </>
  );
};

export default FormList;
