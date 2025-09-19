import React, { useState, useRef, useEffect } from 'react';
import './MenuBar.css'; // Using existing MenuBar CSS for consistency

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsSection {
  id: string;
  label: string;
  icon: string;
  items: SettingsItem[];
}

interface SettingsItem {
  label?: string;
  type?: 'select' | 'checkbox' | 'button' | 'separator';
  value?: string | boolean;
  options?: { label: string; value: string }[];
  action?: () => void;
  separator?: boolean;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const settingsSections: SettingsSection[] = [
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: '📊',
      items: [
        { label: 'Coder1 Dashboard', type: 'button', action: () => window.location.href = '/vibe-dashboard.html' },
        { label: 'Agent Dashboard', type: 'button', action: () => window.location.href = '/agent-dashboard.html' }
      ]
    },
    {
      id: 'account',
      label: 'Account',
      icon: '👤',
      items: [
        { label: 'Profile Settings', type: 'button', action: () => console.log('Profile settings') },
        { label: 'Subscription (Pro)', type: 'button', action: () => console.log('Subscription') },
        { separator: true },
        { label: 'Login', type: 'button', action: () => console.log('Login') },
        { label: 'Logout', type: 'button', action: () => console.log('Logout') }
      ]
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: '💻',
      items: [
        { 
          label: 'Theme', 
          type: 'select', 
          value: 'tokyo-night',
          options: [
            { label: 'Tokyo Night', value: 'tokyo-night' },
            { label: 'Tokyo Night Light', value: 'tokyo-night-light' },
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' }
          ]
        },
        { 
          label: 'Font Size', 
          type: 'select', 
          value: '14',
          options: [
            { label: '12px', value: '12' },
            { label: '13px', value: '13' },
            { label: '14px', value: '14' },
            { label: '16px', value: '16' }
          ]
        },
        { label: 'Show line numbers', type: 'checkbox', value: true },
        { label: 'Show minimap', type: 'checkbox', value: true }
      ]
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: '🖥️',
      items: [
        { 
          label: 'Default Shell', 
          type: 'select', 
          value: 'bash',
          options: [
            { label: 'Bash', value: 'bash' },
            { label: 'Zsh', value: 'zsh' },
            { label: 'Fish', value: 'fish' }
          ]
        },
        { 
          label: 'Terminal Font Size', 
          type: 'select', 
          value: '13',
          options: [
            { label: '11px', value: '11' },
            { label: '12px', value: '12' },
            { label: '13px', value: '13' },
            { label: '14px', value: '14' }
          ]
        }
      ]
    },
    {
      id: 'files',
      label: 'File Management',
      icon: '📁',
      items: [
        { label: 'Auto-save files', type: 'checkbox', value: true },
        { label: 'Show hidden files', type: 'checkbox', value: false }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleSectionClick = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleItemClick = (item: SettingsItem) => {
    if (item.action) {
      item.action();
      onClose();
    }
  };

  const renderSettingsItem = (item: SettingsItem, index: number) => {
    if (item.separator) {
      return <div key={`sep-${index}`} className="menu-separator" />;
    }

    const content = (() => {
      switch (item.type) {
        case 'select':
          return (
            <div className="settings-item-control">
              <span className="settings-item-label">{item.label}</span>
              <select 
                className="settings-select"
                value={item.value as string}
                onChange={(e) => console.log(`${item.label}: ${e.target.value}`)}
                onClick={(e) => e.stopPropagation()}
              >
                {item.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        case 'checkbox':
          return (
            <div className="settings-item-control">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={item.value as boolean}
                  onChange={(e) => console.log(`${item.label}: ${e.target.checked}`)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{item.label}</span>
              </label>
            </div>
          );
        case 'button':
        default:
          return <span className="menu-label">{item.label}</span>;
      }
    })();

    return (
      <div
        key={`item-${index}`}
        className={`menu-item ${item.type === 'button' ? 'settings-button-item' : 'settings-control-item'}`}
        onClick={() => item.type === 'button' && handleItemClick(item)}
        style={{ cursor: item.type === 'button' ? 'pointer' : 'default' }}
      >
        {content}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="menu-dropdown settings-dropdown" style={{ minWidth: '320px' }}>
      <div className="settings-header">
        <span className="menu-label">⚙️ Settings</span>
      </div>
      <div className="menu-separator" />
      
      {settingsSections.map(section => (
        <div key={section.id}>
          <div
            className="menu-item settings-section-header"
            onClick={() => handleSectionClick(section.id)}
          >
            <span className="menu-label">
              {section.icon} {section.label}
            </span>
            <span className="settings-expand-icon">
              {expandedSection === section.id ? '▼' : '▶'}
            </span>
          </div>
          
          {expandedSection === section.id && (
            <div className="settings-section-content">
              {section.items.map((item, index) => renderSettingsItem(item, index))}
            </div>
          )}
          
          <div className="menu-separator" />
        </div>
      ))}
      
      <div className="menu-item settings-button-item" onClick={onClose}>
        <span className="menu-label">✅ Close Settings</span>
      </div>
    </div>
  );
};

export default SettingsDropdown;