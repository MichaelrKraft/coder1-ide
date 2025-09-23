'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Home, Grid, FileText, Code, Sparkles, BookOpen, SettingsIcon, Info, HelpCircle, Keyboard, AlertCircle } from '@/lib/icons';
import { glows } from '@/lib/design-tokens';
import { BridgeConnectButton } from './bridge/BridgeConnectButton';
import { SetupInstructionsModal } from './bridge/SetupInstructionsModal';

interface MenuItem {
  label?: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
}

interface MenuConfig {
  [key: string]: MenuItem[];
}

interface MenuBarProps {
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onToggleExplorer?: () => void;
  onToggleTerminal?: () => void;
  onToggleOutput?: () => void;
  onRunCode?: () => void;
  onDebug?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onCloseFile?: () => void;
  onExit?: () => void;
  onStop?: () => void;
  onShowAbout?: () => void;
  onShowKeyboardShortcuts?: () => void;
  onShowSettings?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
}

/**
 * MenuBar Component
 * 
 * PRESERVED FROM ORIGINAL:
 * - Coder1 logo in upper left
 * - Left: File, Edit, View, Run, Help menu bar
 * - Right: "Menu" button with 8 navigation options
 * - Exact dropdown styling and positioning
 * 
 * DO NOT MODIFY menu items without checking original
 */
export default function MenuBar({
  onNewFile,
  onOpenFile,
  onSave,
  onSaveAs,
  onToggleExplorer,
  onToggleTerminal,
  onToggleOutput,
  onRunCode,
  onDebug,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFind,
  onReplace,
  onCloseFile,
  onExit,
  onStop,
  onShowAbout,
  onShowKeyboardShortcuts,
  onShowSettings,
  onCopy,
  onCut,
  onPaste,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tooltip text for menu buttons
  const getMenuTooltip = (menuName: string): string => {
    const tooltips: { [key: string]: string } = {
      'File': 'File operations - Create, open, save files (Ctrl+N, Ctrl+O, Ctrl+S)',
      'Edit': 'Edit operations - Undo, redo, copy, paste, find (Ctrl+Z, Ctrl+C, Ctrl+V, Ctrl+F)',
      'View': 'View options - Toggle panels, zoom controls (Ctrl+Shift+E, Ctrl+`, Ctrl+±)',
      'Run': 'Run & debug - Execute code, start debugging (F5, F9)',
      'Help': 'Help & documentation - About, shortcuts, support'
    };
    return tooltips[menuName] || `${menuName} menu`;
  };

  // Menu configuration with actual actions
  const menuConfig: MenuConfig = {
    File: [
      { label: 'New File', action: onNewFile || (() => {}), shortcut: 'Ctrl+N' },
      { label: 'Open File...', action: onOpenFile || (() => {}), shortcut: 'Ctrl+O' },
      { separator: true },
      { label: 'Save', action: onSave || (() => {}), shortcut: 'Ctrl+S' },
      { label: 'Save As...', action: onSaveAs || (() => {}), shortcut: 'Ctrl+Shift+S' },
      { separator: true },
      { label: 'Close Editor', action: onCloseFile || (() => {}), shortcut: 'Ctrl+W' },
      { label: 'Exit', action: onExit || (() => {}) }
    ],
    Edit: [
      { label: 'Undo', action: () => document.execCommand('undo'), shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: () => document.execCommand('redo'), shortcut: 'Ctrl+Y' },
      { separator: true },
      { label: 'Cut', action: onCut || (() => console.log('Cut')), shortcut: 'Ctrl+X' },
      { label: 'Copy', action: onCopy || (() => console.log('Copy')), shortcut: 'Ctrl+C' },
      { label: 'Paste', action: onPaste || (() => console.log('Paste')), shortcut: 'Ctrl+V' },
      { separator: true },
      { label: 'Find', action: onFind || (() => console.log('Find')), shortcut: 'Ctrl+F' },
      { label: 'Replace', action: onReplace || (() => console.log('Replace')), shortcut: 'Ctrl+H' }
    ],
    View: [
      { label: 'Explorer', action: onToggleExplorer || (() => console.log('Toggle Explorer')), shortcut: 'Ctrl+Shift+E' },
      { label: 'Terminal', action: onToggleTerminal || (() => console.log('Toggle Terminal')), shortcut: 'Ctrl+`' },
      { label: 'Output', action: onToggleOutput || (() => console.log('Toggle Output')), shortcut: 'Ctrl+Shift+U' },
      { separator: true },
      { label: 'Zoom In', action: onZoomIn || (() => console.log('Zoom In')), shortcut: 'Ctrl+=' },
      { label: 'Zoom Out', action: onZoomOut || (() => console.log('Zoom Out')), shortcut: 'Ctrl+-' },
      { label: 'Reset Zoom', action: onResetZoom || (() => console.log('Reset Zoom')), shortcut: 'Ctrl+0' }
    ],
    Run: [
      { label: 'Run Code', action: onRunCode || (() => console.log('Run Code')), shortcut: 'F5' },
      { label: 'Debug', action: onDebug || (() => console.log('Debug')), shortcut: 'F9' },
      { separator: true },
      { label: 'Stop', action: onStop || (() => console.log('Stop')), shortcut: 'Shift+F5' }
    ],
    Help: [
      { label: 'Bridge Setup Instructions', action: () => setSetupModalOpen(true), shortcut: '' },
      { separator: true },
      { label: 'About Coder1', action: onShowAbout || (() => alert('Coder1 IDE v2.0.0\nBuilt for Claude Code and vibe coders')), shortcut: '' },
      { label: 'Documentation', action: () => window.open('/docs-manager', '_blank'), shortcut: '' },
      { separator: true },
      { label: 'Keyboard Shortcuts', action: onShowKeyboardShortcuts || (() => console.log('Shortcuts')), shortcut: 'Ctrl+K Ctrl+S' },
      { label: 'Report Issue', action: () => window.open('https://github.com/michaelkraft/autonomous_vibe_interface/issues', '_blank') }
    ]
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
    setIsMenuOpen(false); // Close right menu when opening left menu
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  // Menu items with proper routing to Next.js pages
  const menuItems = [
    { icon: Home, label: 'Home page', href: '/' },
    { icon: Grid, label: 'AI dashboard', href: '/vibe-dashboard' },
    { icon: FileText, label: 'Documentation', href: '/documentation.html' },
    { icon: SettingsIcon, label: 'Settings', href: '#', onClick: () => onShowSettings?.() },
  ];

  return (
    <div className="h-20 bg-bg-secondary border-b border-border-default flex items-center justify-between px-3">
      {/* Left section with logo centered in 15% width (matching explorer panel) */}
      <div className="flex items-center flex-1">
        {/* Logo container - 15% width to match explorer panel */}
        <div className="flex justify-center items-center" style={{ width: '15%', minWidth: '150px' }}>
          <Image 
            src="/Coder1-logo-Trans.png" 
            alt="Coder1" 
            width={140} 
            height={50}
            className="object-contain"
            style={{ border: 'none', outline: 'none' }}
            priority
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('logo-fallback');
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span 
            id="logo-fallback" 
            className="text-coder1-cyan font-bold text-2xl hidden"
            style={{
              textShadow: '0 0 20px rgba(0, 217, 255, 0.5)'
            }}
          >
            {'{CODER1}'}
          </span>
        </div>
        
        {/* Menu items container */}
        <div className="flex items-center gap-2 ml-8" ref={menuBarRef}>
        {/* File, Edit, View, Run, Help menus */}
        {Object.keys(menuConfig).map(menuName => (
          <div key={menuName} className="relative">
            <button 
              className={`px-3 py-1 text-sm rounded transition-all duration-200 ${
                activeMenu === menuName ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'
              }`}
              style={{
                textShadow: activeMenu === menuName ? '0 0 15px rgba(251, 146, 60, 0.8)' : 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = '0 0 25px rgba(251, 146, 60, 1), 0 0 40px rgba(251, 146, 60, 0.9), 0 0 60px rgba(251, 146, 60, 0.7)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = activeMenu === menuName ? '0 0 15px rgba(251, 146, 60, 0.8)' : 'none';
                e.currentTarget.style.color = activeMenu === menuName ? '#ffffff' : '#a0a0a0';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={() => handleMenuClick(menuName)}
              title={getMenuTooltip(menuName)}
            >
              {menuName}
            </button>
            {activeMenu === menuName && (
              <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-bg-secondary border border-border-default rounded-md shadow-lg z-50 py-1">
                {menuConfig[menuName].map((item, index) => (
                  item.separator ? (
                    <div key={`sep-${index}`} className="h-px bg-border-default my-1" />
                  ) : (
                    <div
                      key={`item-${index}`}
                      className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer flex justify-between items-center"
                      onClick={() => handleItemClick(item)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-xs text-text-muted ml-4">{item.shortcut}</span>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Settings Gear Icon - positioned after Help menu */}
        <div className="relative ml-4">
          <button
            onClick={() => {
              if (onShowSettings) {
                onShowSettings();
                setActiveMenu(null);
              }
            }}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded transition-all duration-200 hover:bg-bg-tertiary"
            style={{
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)';
              e.currentTarget.style.color = '#FB923C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
              e.currentTarget.style.color = '';
            }}
            title="Settings - Configure IDE preferences and appearance"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
        </div>
      </div>

      {/* Right side - Bridge button and Menu dropdown */}
      <div className="flex items-center gap-2">
        {/* Connect Bridge Button */}
        <BridgeConnectButton />
        
        {/* Menu dropdown */}
        <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="glass-button flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
            border: `1px solid rgba(0, 217, 255, 0.6)`,
            boxShadow: '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 4px 15px -3px rgba(0, 217, 255, 0.15), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            position: 'relative' as const,
            overflow: 'hidden',
            animation: 'borderGlow 2s ease-in-out infinite',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.8)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(251, 146, 60, 0.6), 0 0 30px rgba(251, 146, 60, 0.4), 0 8px 25px -5px rgba(251, 146, 60, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.backdropFilter = 'blur(6px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 4px 15px -3px rgba(0, 217, 255, 0.15), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.backdropFilter = 'blur(4px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
          }}
          title="Main menu - Navigation to dashboard, documentation, and settings"
        >
          <span>Menu</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-border-default rounded-lg shadow-2xl overflow-hidden z-50">
            <div className="py-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                
                // Handle settings menu item with onClick instead of Link
                if (item.onClick) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick?.();
                        setIsMenuOpen(false);
                      }}
                      className="w-full group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      onMouseEnter={(e) => {
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.textShadow = '0 0 8px rgba(251, 146, 60, 0.9), 0 0 16px rgba(251, 146, 60, 0.7), 0 0 24px rgba(251, 146, 60, 0.5)';
                          span.style.color = '#FB923C';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.textShadow = 'none';
                          span.style.color = '';
                        }
                      }}
                    >
                      <Icon 
                        className="w-4 h-4 transition-all duration-300 group-hover:text-orange-400" 
                        style={{
                          filter: 'drop-shadow(0 0 0px transparent)',
                          transition: 'filter 0.3s ease, color 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.9)) drop-shadow(0 0 16px rgba(251, 146, 60, 0.7)) drop-shadow(0 0 24px rgba(251, 146, 60, 0.5))';
                          e.currentTarget.style.color = '#FB923C';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'drop-shadow(0 0 0px transparent)';
                          e.currentTarget.style.color = '';
                        }}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                // Handle regular navigation menu items
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                    onMouseEnter={(e) => {
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.textShadow = '0 0 8px rgba(251, 146, 60, 0.9), 0 0 16px rgba(251, 146, 60, 0.7), 0 0 24px rgba(251, 146, 60, 0.5)';
                        span.style.color = '#FB923C';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.textShadow = 'none';
                        span.style.color = '';
                      }
                    }}
                  >
                    <Icon 
                      className="w-4 h-4 transition-all duration-300 group-hover:text-orange-400" 
                      style={{
                        filter: 'drop-shadow(0 0 0px transparent)',
                        transition: 'filter 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.9)) drop-shadow(0 0 16px rgba(251, 146, 60, 0.7)) drop-shadow(0 0 24px rgba(251, 146, 60, 0.5))';
                        e.currentTarget.style.color = '#FB923C';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'drop-shadow(0 0 0px transparent)';
                        e.currentTarget.style.color = '';
                      }}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Bridge Setup Instructions Modal */}
      <SetupInstructionsModal 
        isOpen={setupModalOpen} 
        onClose={() => setSetupModalOpen(false)}
        showDontShowAgain={false}
      />
    </div>
  );
}