'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useProjectHistory } from '@/lib/hooks/useProjectHistory';

function getFolderName(path: string): string {
  return path.split('/').filter(Boolean).pop() || path;
}

export default function ProjectPicker() {
  const { recentProjects, currentProject, switchProject } = useProjectHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseValue, setBrowseValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const browseInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowBrowse(false);
        setBrowseValue('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Focus browse input when it appears
  useEffect(() => {
    if (showBrowse && browseInputRef.current) {
      browseInputRef.current.focus();
    }
  }, [showBrowse]);

  const handleSelectProject = (path: string) => {
    switchProject(path);
    setIsOpen(false);
    setShowBrowse(false);
    setBrowseValue('');
  };

  const handleBrowseSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && browseValue.trim()) {
      switchProject(browseValue.trim());
      setIsOpen(false);
      setShowBrowse(false);
      setBrowseValue('');
    }
    if (e.key === 'Escape') {
      setShowBrowse(false);
      setBrowseValue('');
    }
  };

  const isEmpty = !currentProject && recentProjects.length === 0;
  const triggerLabel = currentProject ? getFolderName(currentProject) : 'No project loaded';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          color: 'rgba(255,255,255,0.9)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D9FF';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
        }}
        title={currentProject || 'No project loaded'}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span>📁</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {triggerLabel}
          </span>
        </span>
        <span style={{ marginLeft: '8px', opacity: 0.5, flexShrink: 0 }}>▾</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'rgba(14,14,14,0.97)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,217,255,0.2)',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {isEmpty ? (
            <div
              style={{
                padding: '10px 12px',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: '12px',
              }}
            >
              No project loaded
            </div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {/* Current project first if it exists */}
              {currentProject && (
                <ProjectRow
                  path={currentProject}
                  isCurrent={true}
                  onClick={() => handleSelectProject(currentProject)}
                />
              )}
              {/* Recent projects (exclude current) */}
              {recentProjects
                .filter((p) => p !== currentProject)
                .map((path) => (
                  <ProjectRow
                    key={path}
                    path={path}
                    isCurrent={false}
                    onClick={() => handleSelectProject(path)}
                  />
                ))}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '0',
            }}
          />

          {/* Browse row */}
          {!showBrowse ? (
            <button
              onClick={() => setShowBrowse(true)}
              style={{
                width: '100%',
                display: 'block',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(0,217,255,0.08)';
                el.style.color = 'rgba(255,255,255,0.9)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'transparent';
                el.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              Browse…
            </button>
          ) : (
            <div style={{ padding: '6px 10px' }}>
              <input
                ref={browseInputRef}
                type="text"
                value={browseValue}
                onChange={(e) => setBrowseValue(e.target.value)}
                onKeyDown={handleBrowseSubmit}
                placeholder="Enter full path and press Enter"
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '1px solid rgba(0,217,255,0.3)',
                  borderRadius: '4px',
                  padding: '5px 8px',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ProjectRowProps {
  path: string;
  isCurrent: boolean;
  onClick: () => void;
}

function ProjectRow({ path, isCurrent, onClick }: ProjectRowProps) {
  const folderName = getFolderName(path);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 12px',
        background: isCurrent ? 'rgba(0,217,255,0.06)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,217,255,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isCurrent
          ? 'rgba(0,217,255,0.06)'
          : 'transparent';
      }}
    >
      {/* Checkmark column - fixed width so paths align */}
      <span
        style={{
          width: '14px',
          flexShrink: 0,
          color: '#00D9FF',
          fontSize: '12px',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        {isCurrent ? '✓' : ''}
      </span>

      {/* Folder name */}
      <span
        style={{
          color: isCurrent ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '13px',
          flexShrink: 0,
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {folderName}
      </span>

      {/* Full path (muted) */}
      <span
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '11px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 1,
        }}
        title={path}
      >
        {path}
      </span>
    </button>
  );
}
