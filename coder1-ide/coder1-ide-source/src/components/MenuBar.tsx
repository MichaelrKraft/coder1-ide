import React, { useState, useRef, useEffect } from 'react';
import './MenuBar.css';
import SettingsDropdown from './SettingsDropdown';

interface MenuItem {
  label?: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface MenuConfig {
  [key: string]: MenuItem[];
}

interface MenuBarProps {
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onToggleExplorer?: () => void;
  onToggleTerminal?: () => void;
  onToggleOutput?: () => void;
  onRunCode?: () => void;
  onDebug?: () => void;
  onStop?: () => void;
  onAbout?: () => void;
  onDocumentation?: () => void;
  onKeyboardShortcuts?: () => void;
}

const MenuBar: React.FC<MenuBarProps> = (props) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuConfig: MenuConfig = {
    File: [
      { label: 'New File', action: props.onNewFile, shortcut: 'Ctrl+N' },
      { label: 'Open File...', action: props.onOpenFile, shortcut: 'Ctrl+O' },
      { separator: true },
      { label: 'Save', action: props.onSave, shortcut: 'Ctrl+S' },
      { label: 'Save As...', action: props.onSaveAs, shortcut: 'Ctrl+Shift+S' },
      { separator: true },
      { label: 'Close Editor', action: () => console.log('Close editor'), shortcut: 'Ctrl+W' },
      { label: 'Exit', action: () => window.close() }
    ],
    Edit: [
      { label: 'Undo', action: props.onUndo, shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: props.onRedo, shortcut: 'Ctrl+Y' },
      { separator: true },
      { label: 'Cut', action: props.onCut, shortcut: 'Ctrl+X' },
      { label: 'Copy', action: props.onCopy, shortcut: 'Ctrl+C' },
      { label: 'Paste', action: props.onPaste, shortcut: 'Ctrl+V' },
      { separator: true },
      { label: 'Find', action: props.onFind, shortcut: 'Ctrl+F' },
      { label: 'Replace', action: props.onReplace, shortcut: 'Ctrl+H' }
    ],
    View: [
      { label: 'Explorer', action: props.onToggleExplorer, shortcut: 'Ctrl+Shift+E' },
      { label: 'Terminal', action: props.onToggleTerminal, shortcut: 'Ctrl+`' },
      { label: 'Output', action: props.onToggleOutput, shortcut: 'Ctrl+Shift+U' },
      { separator: true },
      { label: 'Zoom In', action: () => (document.body.style as any).zoom = '110%', shortcut: 'Ctrl+=' },
      { label: 'Zoom Out', action: () => (document.body.style as any).zoom = '90%', shortcut: 'Ctrl+-' },
      { label: 'Reset Zoom', action: () => (document.body.style as any).zoom = '100%', shortcut: 'Ctrl+0' }
    ],
    Run: [
      { label: 'Run Code', action: props.onRunCode, shortcut: 'F5' },
      { label: 'Debug', action: props.onDebug, shortcut: 'F9' },
      { separator: true },
      { label: 'Stop', action: props.onStop, shortcut: 'Shift+F5' }
    ],
    Help: [
      { label: 'About Coder1', action: props.onAbout },
      { label: 'Documentation', action: props.onDocumentation },
      { separator: true },
      { label: 'Keyboard Shortcuts', action: props.onKeyboardShortcuts, shortcut: 'Ctrl+K Ctrl+S' },
      { label: 'Report Issue', action: () => window.open('https://github.com', '_blank') }
    ]
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
    // Close settings dropdown when opening a menu
    setShowSettingsDropdown(false);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  const handleSettingsClick = () => {
    setShowSettingsDropdown(!showSettingsDropdown);
    // Close any open menu when opening settings
    setActiveMenu(null);
  };

  const handleSettingsClose = () => {
    setShowSettingsDropdown(false);
  };

  return (
    <nav className="menu-bar" ref={menuRef}>
      {Object.keys(menuConfig).map(menuName => (
        <div key={menuName} className="menu-container">
          <button
            className={`menu-button ${activeMenu === menuName ? 'active' : ''}`}
            onClick={() => handleMenuClick(menuName)}
          >
            {menuName}
          </button>
          {activeMenu === menuName && (
            <div className="menu-dropdown">
              {menuConfig[menuName].map((item, index) => (
                item.separator ? (
                  <div key={`sep-${index}`} className="menu-separator" />
                ) : (
                  <div
                    key={`item-${index}`}
                    className="menu-item"
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="menu-label">{item.label || ''}</span>
                    {item.shortcut && (
                      <span className="menu-shortcut">{item.shortcut}</span>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Settings Button and Dropdown */}
      <div className="menu-container">
        <button
          className={`menu-button ${showSettingsDropdown ? 'active' : ''}`}
          onClick={handleSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
        <SettingsDropdown
          isOpen={showSettingsDropdown}
          onClose={handleSettingsClose}
        />
      </div>
    </nav>
  );
};

export default MenuBar;