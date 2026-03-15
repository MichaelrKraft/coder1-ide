'use client';

import React from 'react';
import { Trash2, FileCode, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFileEditsStore, FileEdit } from '@/stores/useFileEditsStore';
import { useIDEStore } from '@/stores/useIDEStore';

function getFileIcon(basename: string) {
  const ext = basename.split('.').pop()?.toLowerCase() ?? '';
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift'];
  return codeExts.includes(ext) ? FileCode : File;
}

function OperationPill({ operation }: { operation: FileEdit['operation'] }) {
  if (operation === 'created') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium shrink-0">
        created
      </span>
    );
  }
  if (operation === 'deleted') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium shrink-0 line-through">
        deleted
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-medium shrink-0">
      edited
    </span>
  );
}

function FileEditRow({ edit, onOpenFile }: { edit: FileEdit; onOpenFile: (path: string) => void }) {
  const Icon = getFileIcon(edit.basename);
  const isDeleted = edit.operation === 'deleted';

  const handleClick = () => {
    if (isDeleted) return;
    onOpenFile(edit.path);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-1.5 hover:bg-bg-secondary transition-colors ${
        isDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ minHeight: '32px' }}
      onClick={handleClick}
      title={edit.path}
    >
      <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />

      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className={`text-xs text-text-primary truncate ${isDeleted ? 'line-through' : ''}`}>
          {edit.basename}
        </span>
        {edit.directory && (
          <span className="text-[10px] text-text-muted truncate shrink-0">
            {edit.directory}/
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {edit.hasStats ? (
          <>
            {edit.additions > 0 && (
              <span className={`text-[10px] text-green-400 font-mono ${isDeleted ? 'italic' : ''}`}>
                +{edit.additions}
              </span>
            )}
            {edit.deletions > 0 && (
              <span className={`text-[10px] text-red-400 font-mono ${isDeleted ? 'italic' : ''}`}>
                -{edit.deletions}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-text-muted font-mono">…</span>
        )}
        <OperationPill operation={edit.operation} />
        <span className="text-[10px] text-text-muted hidden group-hover:block whitespace-nowrap">
          {formatDistanceToNow(new Date(edit.lastEditedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default function FileEditsPanel() {
  const { edits, clearEdits } = useFileEditsStore();
  const openFile = useIDEStore((s) => s.openFile);

  const sortedEdits = [...edits].sort((a, b) => b.lastEditedAt - a.lastEditedAt);

  const handleOpenFile = (path: string) => {
    const basename = path.split('/').pop() ?? path;
    openFile({
      id: path,
      path,
      name: basename,
      content: '',
      isDirty: false,
      isOpen: true,
      language: 'text',
      type: 'unknown',
      lastModified: new Date(),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Files Changed
          {edits.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-coder1-cyan/20 text-coder1-cyan text-[10px] rounded-full font-medium">
              {edits.length}
            </span>
          )}
        </span>
        {edits.length > 0 && (
          <button
            onClick={clearEdits}
            title="Clear file edit history"
            className="text-text-muted hover:text-text-secondary transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sortedEdits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted px-4">
            <FileCode className="w-8 h-8 opacity-30" />
            <span className="text-xs text-center">No files modified yet</span>
            <span className="text-[10px] text-center opacity-60">
              File changes will appear here as Claude edits your code
            </span>
          </div>
        ) : (
          sortedEdits.map((edit) => (
            <FileEditRow key={edit.path} edit={edit} onOpenFile={handleOpenFile} />
          ))
        )}
      </div>
    </div>
  );
}
