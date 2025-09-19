import React from 'react';
import './Explorer.css';

const Explorer: React.FC = () => {
  return (
    <div className="explorer">
      <div className="explorer-content">
        <div className="folder">
          <span className="folder-icon">📁</span> src/
          <div className="folder-contents">
            <div className="file">
              <span className="file-icon">📄</span> App.tsx
            </div>
            <div className="file">
              <span className="file-icon">📄</span> index.tsx
            </div>
            <div className="folder">
              <span className="folder-icon">📁</span> components/
            </div>
          </div>
        </div>
        <div className="folder">
          <span className="folder-icon">📁</span> public/
        </div>
        <div className="file">
          <span className="file-icon">📄</span> package.json
        </div>
      </div>
    </div>
  );
};

export default Explorer;