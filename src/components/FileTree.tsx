import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileTreeProps {
  files: FileNode[];
  onFileOpen: (path: string) => void;
  onFileToggle: (path: string) => void;
  selectedFile?: string;
}

const FileTreeItem: React.FC<{
  node: FileNode;
  onFileOpen: (path: string) => void;
  onFileToggle: (path: string) => void;
  selectedFile?: string;
  level: number;
}> = ({ node, onFileOpen, onFileToggle, selectedFile, level }) => {
  const [isOpen, setIsOpen] = useState(node.isOpen || false);

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
      onFileToggle(node.path);
    } else {
      onFileOpen(node.path);
    }
  };

  const isSelected = selectedFile === node.path;

  return (
    <div>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        <div className="file-tree-item-content">
          {node.type === 'directory' && (
            <span className="file-tree-icon">
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
          <span className="file-tree-icon">
            {node.type === 'directory' ? <Folder size={16} /> : <File size={16} />}
          </span>
          <span className="file-tree-name">{node.name}</span>
        </div>
      </div>
      {node.type === 'directory' && isOpen && node.children && (
        <div className="file-tree-children">
          {node.children.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              node={child}
              onFileOpen={onFileOpen}
              onFileToggle={onFileToggle}
              selectedFile={selectedFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ files, onFileOpen, onFileToggle, selectedFile }) => {
  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>Explorer</h3>
      </div>
      <div className="file-tree-content">
        {files.map((file, index) => (
          <FileTreeItem
            key={`${file.path}-${index}`}
            node={file}
            onFileOpen={onFileOpen}
            onFileToggle={onFileToggle}
            selectedFile={selectedFile}
            level={0}
          />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
