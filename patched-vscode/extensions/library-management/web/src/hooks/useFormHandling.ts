import { useCallback, useEffect } from 'react';
import { FormType, SectionForms, ValidationResult } from '../types/types';
import { sectionConfigs } from '../config/config';
import { getFormTypeForSection } from '../utils/utils';

export const useFormHandling = (
  selectedSection: string,
  sectionForms: SectionForms,
  setSectionForms: React.Dispatch<React.SetStateAction<SectionForms>>,
  setHasInvalidPaths: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const handleAddForm = useCallback((formType: FormType) => {
        setSectionForms((prev: SectionForms): SectionForms => {
          if (selectedSection === 'Python - Conda Packages') {
            const currentForms = [...(prev[selectedSection] || [])];
            const newForm = {
              id: `form-${Date.now()}-${Math.random()}`,
              value: '',
              type: formType
            };

            return {
                ...prev,
                [selectedSection]: [...currentForms, newForm]
            };
          }
    
          return {
            ...prev,
            [selectedSection]: [
              ...(prev[selectedSection] || []),
              { id: `form-${Date.now()}`, value: '', type: getFormTypeForSection(selectedSection) }
            ]
          };
        });
      }, [selectedSection]);

  const handleFormChange = useCallback((
    formId: string, 
    value: string, 
    formType: FormType
  ) => {
    setSectionForms(prev => {
      const currentForms = [...(prev[selectedSection] || [])];
      const formIndex = currentForms.findIndex(f => f.id === formId);
      
      if (formIndex === -1) return prev;

      currentForms[formIndex] = {
        ...currentForms[formIndex],
        value,
        ...(formType && { type: formType })
      };

      return {
        ...prev,
        [selectedSection]: currentForms
      };
    });
  }, [selectedSection]);

  const handleRemoveForm = useCallback((formId: string) => {
    setSectionForms(prev => {
      if (selectedSection === 'Python - Conda Packages') {
        const currentForms = [...(prev[selectedSection] || [])];
        const formToRemove = currentForms.find(f => f.id === formId);
        
        if (!formToRemove) return prev;

        const channelForms = currentForms.filter(f => 
          f.type === FormType.channel && f.id !== formId
        );
        const specForms = currentForms.filter(f => 
          f.type === FormType.spec && f.id !== formId
        );

        return {
          ...prev,
          [selectedSection]: [...channelForms, ...specForms]
        };
      }

      return {
        ...prev,
        [selectedSection]: prev[selectedSection].filter(f => f.id !== formId)
      };
    });
  }, [selectedSection]);

  const handleMoveForm = useCallback((
    formId: string, 
    direction: 'up' | 'down',
    formType: FormType
  ) => {
    setSectionForms(prev => {
      const currentForms = [...(prev[selectedSection] || [])];
      const formIndex = currentForms.findIndex(f => f.id === formId);
      
      if (formIndex === -1) return prev;

      if (selectedSection === 'Python - Conda Packages') {
        const relevantForms = currentForms.filter(f => f.type === formType);
        const relevantIndex = relevantForms.findIndex(f => f.id === formId);

        if (
          (direction === 'up' && relevantIndex === 0) ||
          (direction === 'down' && relevantIndex === relevantForms.length - 1)
        ) {
          return prev;
        }

        const targetIndex = direction === 'up' 
          ? formIndex - 1 
          : formIndex + 1;

        if (currentForms[targetIndex]?.type !== formType) {
          return prev;
        }

        [currentForms[formIndex], currentForms[targetIndex]] = 
        [currentForms[targetIndex], currentForms[formIndex]];
      } else {
        const targetIndex = direction === 'up' ? formIndex - 1 : formIndex + 1;

        if (
          (direction === 'up' && formIndex === 0) ||
          (direction === 'down' && formIndex === currentForms.length - 1)
        ) {
          return prev;
        }

        [currentForms[formIndex], currentForms[targetIndex]] = 
        [currentForms[targetIndex], currentForms[formIndex]];
      }

      return {
        ...prev,
        [selectedSection]: currentForms
      };
    });
  }, [selectedSection]);

  const validateForm = useCallback((
    value: string, 
    formType: FormType | undefined
  ): ValidationResult => {

    if (!value.trim()) {
      return {
        isValid: false,
        errorMessage: 'This field cannot be empty'
      };
    }

    if (selectedSection === 'Python - Conda Packages') {
      if (formType === FormType.channel) {
        const isValidChannel = /^[a-zA-Z0-9_-]+$/.test(value);
        return {
          isValid: isValidChannel,
          errorMessage: isValidChannel ? '' : 'Invalid channel name'
        };
      } else {
        const isValidSpec = /^[a-zA-Z0-9_-]+([>=<]=?[0-9.]+)?$/.test(value);
        return {
          isValid: isValidSpec,
          errorMessage: isValidSpec ? '' : 'Invalid package specification'
        };
      }
    }

    const config = sectionConfigs[selectedSection];
    const isValid = config.regex.test(value);
    return {
      isValid,
      errorMessage: isValid ? '' : config.formatInfo
    };
  }, [selectedSection, sectionForms]);

  const getPlaceholderText = useCallback((formType?: string | 'channel' | 'spec'): string => {
    if (selectedSection === 'Python - Conda Packages') {
      return formType === 'channel' ? 'conda-forge' : 'package>=1.0.0';
    }

    switch (selectedSection) {
      case 'Jar - Maven Artifacts':
        return 'groupId:artifactId:version';
      case 'Jar - S3 Paths':
        return 's3://bucket-name/path/to/file.jar';
      case 'Jar - Disk Location Paths':
        return 'file:/path/to/file.jar';
      case 'Jar - Other Paths':
        return 'http://domain.com/path/to/file.jar';
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
  }, [selectedSection]);

  const validateAllForms = useCallback((): boolean => {
  
    return Object.entries(sectionForms).every(([section, forms]) => {
      if (forms.length === 0) return true;

      return forms.every(form => {
        if (!form.value.trim()) return false;
        
        const validation = validateForm(
          form.value, 
          section === 'Python - Conda Packages' ? form.type : undefined
        );
        return validation.isValid;
      });
    });
  }, [sectionForms, validateForm]);

  // Update hasInvalidPaths whenever forms change
  useEffect(() => {
    const isValid = validateAllForms();
    setHasInvalidPaths(!isValid);
  }, [sectionForms, selectedSection]);

  return {
    handleAddForm,
    handleRemoveForm,
    handleFormChange,
    handleMoveForm,
    validateForm,
    getPlaceholderText
  };
};
