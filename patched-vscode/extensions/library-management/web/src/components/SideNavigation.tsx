import React from 'react';
import {
  Drawer,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Box,
  Button,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { navigationStructure } from '../config/config';

const drawerWidth = 250;

const StyledDrawer = styled(Drawer)({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    backgroundColor: 'var(--vscode-sideBar-background)',
    color: 'var(--vscode-sideBar-foreground)',
    border: 'none',
    boxSizing: 'border-box',
  },
});

const StyledListItemButton = styled(ListItemButton)({
    padding: '8px 24px',
    '&.Mui-selected': {
      backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
      color: 'var(--vscode-list-activeSelectionForeground)',
      '&:hover': {
        backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
      },
    },
    '&:hover': {
      backgroundColor: 'var(--vscode-list-hoverBackground)',
    },
});

const CategoryLabel = styled(Typography)({
  color: 'var(--vscode-sideBarSectionHeader-foreground)',
  padding: '16px 24px 8px',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  fontWeight: 500,
});

interface SideNavigationProps {
  selectedSection: string;
  onSectionSelect: (section: string) => void;
  applyToCodeEditor: boolean;
  setApplyToCodeEditor: (apply: boolean) => void;
  hasInvalidPaths: boolean;
  onSave: () => void;
}

const SideNavigation: React.FC<SideNavigationProps> = ({
  selectedSection,
  onSectionSelect,
  applyToCodeEditor,
  setApplyToCodeEditor,
  hasInvalidPaths,
  onSave
}) => {
  return (
    <StyledDrawer variant="permanent">
      <Typography variant="h6" sx={{ p: 3, fontWeight: 500 }}>
        Library Management
      </Typography>
      
      {Object.entries(navigationStructure).map(([category, items]) => (
        <Box key={category}>
          <CategoryLabel>{category}</CategoryLabel>
          <List>
            {items.map((item) => (
              <StyledListItemButton
                key={item.id}
                selected={selectedSection === item.id}
                onClick={() => onSectionSelect(item.id)}
              >
                <ListItemText 
                  primary={item.label}
                />
              </StyledListItemButton>
            ))}
          </List>
        </Box>
      ))}
      <Box sx={{ mt: 4, px: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={applyToCodeEditor}
              onChange={(e) => setApplyToCodeEditor(e.target.checked)}
              sx={{
                color: '#8c8c8c',
                '&.Mui-checked': {
                  color: '#0066cc',
                },
              }}
            />
          }
          label="Apply the change to Code Editor"
        />
        <Button
          variant="contained"
          fullWidth
          sx={{ 
            mt: 2,
            backgroundColor: '#4a4a4a',
            '&:hover': {
              backgroundColor: '#383d47'
            },
            '&:disabled': {
                color: '#888'
            }
          }}
          onClick={onSave}
          disabled={hasInvalidPaths}
        >
          Save all changes
        </Button>
        {hasInvalidPaths && (
          <Typography 
            color="error" 
            sx={{ 
              textAlign: 'center',
              padding: '2px',
              color: 'rgb(200,0,0)',
              marginTop: '4px',
            }}
          >
            Fix all paths to apply changes
          </Typography>
        )}
      </Box>
    </StyledDrawer>
  );
};

export default SideNavigation;
