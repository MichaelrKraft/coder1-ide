import React, { useState } from 'react';
import Button, { ButtonGroup, ButtonToolbar, IconButton } from './Button';
import { useDesignTokens } from './useDesignTokens';

// Demo component to showcase button variants and functionality
const ButtonDemo: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { colors, getSpacing } = useDesignTokens();
  
  const handleLoadingDemo = (buttonId: string) => {
    setLoading(buttonId);
    setTimeout(() => setLoading(null), 2000);
  };
  
  // Simple icons for demo
  const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
  
  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7,10 12,15 17,10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );
  
  const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
  
  return (
    <div style={{ 
      padding: getSpacing(6), 
      backgroundColor: colors.background,
      color: colors.textPrimary,
      fontFamily: 'var(--font-family-sans)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ 
        fontSize: 'var(--font-size-3xl)', 
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: getSpacing(6),
        color: colors.primary
      }}>
        🎨 Design System - Button Components
      </h1>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Button Variants
        </h2>
        <ButtonGroup spacing="lg">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Button Sizes
        </h2>
        <ButtonGroup spacing="lg">
          <Button size="sm" variant="primary">Small</Button>
          <Button size="base" variant="primary">Base</Button>
          <Button size="lg" variant="primary">Large</Button>
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Buttons with Icons
        </h2>
        <ButtonGroup spacing="lg">
          <Button variant="primary" leftIcon={<PlusIcon />}>
            New File
          </Button>
          <Button variant="secondary" rightIcon={<DownloadIcon />}>
            Download
          </Button>
          <Button variant="outline" leftIcon={<PlusIcon />} rightIcon={<DownloadIcon />}>
            Both Icons
          </Button>
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Loading States
        </h2>
        <ButtonGroup spacing="lg">
          <Button 
            variant="primary" 
            loading={loading === 'primary'}
            loadingText="Saving..."
            onClick={() => handleLoadingDemo('primary')}
          >
            Save Changes
          </Button>
          <Button 
            variant="secondary" 
            loading={loading === 'secondary'}
            onClick={() => handleLoadingDemo('secondary')}
            leftIcon={<DownloadIcon />}
          >
            Download File
          </Button>
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Glow Effects
        </h2>
        <ButtonGroup spacing="lg">
          <Button variant="primary" glow>Primary Glow</Button>
          <Button variant="secondary" glow>Secondary Glow</Button>
          <Button variant="danger" glow>Danger Glow</Button>
          <Button variant="success" glow>Success Glow</Button>
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Icon Buttons
        </h2>
        <ButtonGroup spacing="lg">
          <IconButton 
            icon={<PlusIcon />} 
            variant="primary" 
            aria-label="Add new item"
          />
          <IconButton 
            icon={<DownloadIcon />} 
            variant="secondary" 
            aria-label="Download file"
          />
          <IconButton 
            icon={<SettingsIcon />} 
            variant="outline" 
            aria-label="Settings"
          />
          <IconButton 
            icon={<SettingsIcon />} 
            variant="ghost" 
            aria-label="Settings"
            size="lg"
          />
        </ButtonGroup>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Button Toolbar
        </h2>
        <ButtonToolbar>
          <ButtonGroup>
            <Button variant="outline" size="sm">Cut</Button>
            <Button variant="outline" size="sm">Copy</Button>
            <Button variant="outline" size="sm">Paste</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="primary" size="sm">Save</Button>
            <Button variant="ghost" size="sm">Cancel</Button>
          </ButtonGroup>
        </ButtonToolbar>
      </section>
      
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Disabled States
        </h2>
        <ButtonGroup spacing="lg">
          <Button variant="primary" disabled>Primary Disabled</Button>
          <Button variant="secondary" disabled>Secondary Disabled</Button>
          <Button variant="outline" disabled>Outline Disabled</Button>
        </ButtonGroup>
      </section>
      
      <section>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Full Width Button
        </h2>
        <Button variant="primary" fullWidth leftIcon={<PlusIcon />}>
          Create New Project
        </Button>
      </section>
    </div>
  );
};

export default ButtonDemo;