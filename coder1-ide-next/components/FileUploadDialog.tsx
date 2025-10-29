'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, File, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded?: (filePaths: string[]) => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
  uploadedPath?: string;
}

export default function FileUploadDialog({ isOpen, onClose, onFilesUploaded }: FileUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFile = async (uploadFile: UploadFile, index: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    const formData = new FormData();
    formData.append('file', uploadFile.file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            uploadedPath: data.path 
          } : f
        ));
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files
      .map((f, index) => ({ file: f, index }))
      .filter(({ file }) => file.status === 'pending');

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }

    // Notify parent of successful uploads
    const uploadedPaths = files
      .filter(f => f.status === 'success' && f.uploadedPath)
      .map(f => f.uploadedPath!);
    
    if (uploadedPaths.length > 0 && onFilesUploaded) {
      onFilesUploaded(uploadedPaths);
    }
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  const hasFiles = files.length > 0;
  const hasUploading = files.some(f => f.status === 'uploading');
  const allCompleted = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-[600px] max-h-[700px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 className="text-lg font-semibold text-white">Upload Files from Your Computer</h2>
          <button
            onClick={handleClose}
            disabled={hasUploading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-4">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-coder1-cyan bg-coder1-cyan/10' : 'border-gray-600 hover:border-gray-500'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-white mb-2">Drag and drop files here</p>
            <p className="text-sm text-gray-400 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-coder1-cyan text-black rounded-md hover:bg-coder1-cyan-light transition-colors font-medium"
            >
              Browse Your Computer
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Maximum file size: 5MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        </div>

        {/* File List */}
        {hasFiles && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {files.map((uploadFile, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-bg-primary rounded-md"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{uploadFile.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(uploadFile.file.size)}
                        {uploadFile.status === 'error' && uploadFile.error && (
                          <span className="text-red-400 ml-2">- {uploadFile.error}</span>
                        )}
                        {uploadFile.status === 'success' && (
                          <span className="text-green-400 ml-2">- Uploaded successfully</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-bg-secondary">
          <div className="text-sm text-gray-400">
            {files.length > 0 && (
              <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={hasUploading}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>
            {!allCompleted && (
              <button
                onClick={handleUploadAll}
                disabled={!hasFiles || hasUploading}
                className={`
                  px-4 py-2 text-sm rounded-md transition-all
                  ${hasFiles && !hasUploading ? 
                    'bg-coder1-cyan text-black hover:bg-coder1-cyan-light' : 
                    'bg-gray-700 text-gray-500 cursor-not-allowed'}
                `}
              >
                {hasUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
