import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './EditorTerminalSplit.css';

interface EditorTerminalSplitProps {
  editor: React.ReactNode;
  terminal: React.ReactNode;
  defaultTerminalSize?: number;
}

export const EditorTerminalSplit: React.FC<EditorTerminalSplitProps> = ({
  editor,
  terminal,
  defaultTerminalSize = 40
}) => {
  return (
    <PanelGroup direction="vertical" className="editor-terminal-split">
      {/* Editor Panel */}
      <Panel
        minSize={20}
        className="editor-panel"
      >
        <div className="editor-container">
          {editor}
        </div>
      </Panel>

      <PanelResizeHandle className="resize-handle resize-handle-horizontal">
        <div className="resize-handle-inner" />
      </PanelResizeHandle>

      {/* Terminal Panel */}
      <Panel
        defaultSize={defaultTerminalSize}
        minSize={10}
        maxSize={95}
        className="terminal-panel"
      >
        <div className="terminal-container">
          {terminal}
        </div>
      </Panel>
    </PanelGroup>
  );
};

export default EditorTerminalSplit;