import React, { useState, useEffect, useRef } from 'react';
import './CheckpointTimeline.css';
import { Checkpoint, CheckpointDiff, checkpointService } from '../services/checkpoints';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

interface CheckpointTimelineProps {
  sessionId: string;
  onCheckpointSelect?: (checkpoint: Checkpoint) => void;
  onCheckpointRestore?: (checkpoint: Checkpoint) => void;
  onClose?: () => void;
  compact?: boolean;
}

interface TimelineNode {
  checkpoint: Checkpoint;
  x: number;
  y: number;
  branch: number;
  selected: boolean;
  diff?: CheckpointDiff;
}

const CheckpointTimeline: React.FC<CheckpointTimelineProps> = ({
  sessionId,
  onCheckpointSelect,
  onCheckpointRestore,
  onClose,
  compact = false
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [timelineNodes, setTimelineNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [compareWith, setCompareWith] = useState<Checkpoint | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'grid'>('timeline');
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const isEnabled = useFeatureFlag('SESSION_CHECKPOINTS');

  useEffect(() => {
    if (isEnabled && sessionId) {
      loadCheckpoints();
    }
  }, [sessionId, isEnabled]);

  useEffect(() => {
    if (checkpoints.length > 0) {
      calculateTimelineLayout();
    }
  }, [checkpoints, viewMode]);

  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await checkpointService.getCheckpoints(sessionId);
      setCheckpoints(data.sort((a, b) => a.timestamp - b.timestamp));
      
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
      setError('Failed to load checkpoints');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimelineLayout = () => {
    if (!checkpoints.length) return;

    const nodes: TimelineNode[] = [];
    const TIMELINE_WIDTH = 800;
    const TIMELINE_HEIGHT = 400;
    const NODE_SPACING = 100;
    
    // Sort by timestamp
    const sorted = [...checkpoints].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate positions
    sorted.forEach((checkpoint, index) => {
      const progress = index / Math.max(sorted.length - 1, 1);
      
      let x, y, branch = 0;
      
      if (viewMode === 'timeline') {
        // Horizontal timeline
        x = progress * (TIMELINE_WIDTH - 100) + 50;
        y = TIMELINE_HEIGHT / 2;
        
        // Create branches for concurrent checkpoints
        const sameTimeCheckpoints = sorted.filter(cp => 
          Math.abs(cp.timestamp - checkpoint.timestamp) < 60000 // 1 minute
        );
        
        if (sameTimeCheckpoints.length > 1) {
          const branchIndex = sameTimeCheckpoints.indexOf(checkpoint);
          branch = branchIndex;
          y += (branchIndex - (sameTimeCheckpoints.length - 1) / 2) * 60;
        }
        
      } else if (viewMode === 'grid') {
        // Grid layout
        const cols = Math.ceil(Math.sqrt(sorted.length));
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        x = (col * NODE_SPACING) + 50;
        y = (row * NODE_SPACING) + 50;
        
      } else {
        // List layout
        x = 50;
        y = index * 60 + 30;
      }

      nodes.push({
        checkpoint,
        x,
        y,
        branch,
        selected: selectedCheckpoint?.id === checkpoint.id,
        diff: compareWith ? checkpointService.compareCheckpoints(compareWith, checkpoint) : undefined
      });
    });

    setTimelineNodes(nodes);
  };

  const handleCheckpointClick = (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    onCheckpointSelect?.(checkpoint);
  };

  const handleRestore = (checkpoint: Checkpoint) => {
    if (window.confirm(`Are you sure you want to restore to "${checkpoint.name}"? This will replace your current session state.`)) {
      onCheckpointRestore?.(checkpoint);
    }
  };

  const handleCompare = (checkpoint: Checkpoint) => {
    if (compareWith?.id === checkpoint.id) {
      setCompareWith(null);
      setShowDiff(false);
    } else if (!compareWith) {
      setCompareWith(checkpoint);
    } else {
      setShowDiff(true);
    }
  };

  const handleDelete = async (checkpoint: Checkpoint) => {
    if (window.confirm(`Delete checkpoint "${checkpoint.name}"?`)) {
      try {
        await checkpointService.deleteCheckpoint(sessionId, checkpoint.id);
        await loadCheckpoints();
      } catch (error) {
        console.error('Failed to delete checkpoint:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${Math.floor(ms / 1000)}s`;
  };

  const getCheckpointColor = (checkpoint: Checkpoint) => {
    if (checkpoint.metadata.autoGenerated) return '#666';
    if (checkpoint.metadata.tags.includes('milestone')) return '#00ff00';
    if (checkpoint.metadata.tags.includes('backup')) return '#ffaa00';
    return '#007acc';
  };

  if (!isEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="checkpoint-timeline-loading">
        <div className="loading-spinner"></div>
        <div>Loading checkpoints...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkpoint-timeline-error">
        <div>Error: {error}</div>
        <button onClick={loadCheckpoints}>Retry</button>
      </div>
    );
  }

  return (
    <div className={`checkpoint-timeline ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-title">
          <span className="timeline-icon">⏱️</span>
          Session Checkpoints
          <span className="checkpoint-count">({checkpoints.length})</span>
        </div>
        
        <div className="timeline-controls">
          <div className="view-mode-selector">
            <button 
              className={viewMode === 'timeline' ? 'active' : ''}
              onClick={() => setViewMode('timeline')}
              title="Timeline view"
            >
              📈
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              📋
            </button>
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⚏
            </button>
          </div>
          
          {onClose && (
            <button className="close-button" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* Timeline Visualization */}
      {checkpoints.length === 0 ? (
        <div className="timeline-empty">
          <div className="empty-icon">📸</div>
          <div>No checkpoints yet</div>
          <div className="empty-subtitle">Create checkpoints to save session states</div>
        </div>
      ) : (
        <div className="timeline-container" ref={timelineRef}>
          <svg
            ref={svgRef}
            className="timeline-svg"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Timeline connections */}
            {timelineNodes.map((node, index) => {
              const nextNode = timelineNodes[index + 1];
              if (!nextNode || viewMode !== 'timeline') return null;
              
              return (
                <line
                  key={`connection-${node.checkpoint.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  stroke="#444"
                  strokeWidth="2"
                  strokeDasharray={node.branch !== nextNode.branch ? "5,5" : "none"}
                />
              );
            })}
            
            {/* Checkpoint nodes */}
            {timelineNodes.map((node) => (
              <g key={node.checkpoint.id}>
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.selected ? 12 : 8}
                  fill={getCheckpointColor(node.checkpoint)}
                  stroke={node.selected ? '#fff' : 'none'}
                  strokeWidth="2"
                  className="checkpoint-node"
                  onClick={() => handleCheckpointClick(node.checkpoint)}
                />
                
                {/* Compare indicator */}
                {compareWith?.id === node.checkpoint.id && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="16"
                    fill="none"
                    stroke="#ff6b35"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                )}
                
                {/* Auto-generated indicator */}
                {node.checkpoint.metadata.autoGenerated && (
                  <text
                    x={node.x}
                    y={node.y - 20}
                    textAnchor="middle"
                    className="auto-indicator"
                    fontSize="10"
                  >
                    🤖
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Checkpoint Details Panel */}
      {selectedCheckpoint && (
        <div className="checkpoint-details">
          <div className="details-header">
            <div className="checkpoint-name">{selectedCheckpoint.name}</div>
            <div className="checkpoint-timestamp">
              {formatTimestamp(selectedCheckpoint.timestamp)}
            </div>
          </div>
          
          {selectedCheckpoint.description && (
            <div className="checkpoint-description">
              {selectedCheckpoint.description}
            </div>
          )}
          
          <div className="checkpoint-metadata">
            <div className="metadata-item">
              <span>Size:</span> {(selectedCheckpoint.metadata.size / 1024).toFixed(1)} KB
            </div>
            <div className="metadata-item">
              <span>Messages:</span> {selectedCheckpoint.data.messages.length}
            </div>
            <div className="metadata-item">
              <span>Files:</span> {selectedCheckpoint.data.activeFiles.length}
            </div>
            <div className="metadata-item">
              <span>Mode:</span> {selectedCheckpoint.data.thinkingMode}
            </div>
          </div>
          
          {selectedCheckpoint.metadata.tags.length > 0 && (
            <div className="checkpoint-tags">
              {selectedCheckpoint.metadata.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
          
          <div className="checkpoint-actions">
            <button 
              onClick={() => handleRestore(selectedCheckpoint)}
              className="restore-button"
            >
              🔄 Restore
            </button>
            <button 
              onClick={() => handleCompare(selectedCheckpoint)}
              className="compare-button"
            >
              📊 {compareWith ? 'Compare' : 'Select for Compare'}
            </button>
            {!selectedCheckpoint.metadata.autoGenerated && (
              <button 
                onClick={() => handleDelete(selectedCheckpoint)}
                className="delete-button"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comparison View */}
      {showDiff && compareWith && selectedCheckpoint && (
        <div className="checkpoint-comparison">
          <div className="comparison-header">
            <h3>Comparing Checkpoints</h3>
            <button onClick={() => setShowDiff(false)}>✕</button>
          </div>
          
          <div className="comparison-content">
            <div className="checkpoint-info">
              <div className="from-checkpoint">
                <h4>{compareWith.name}</h4>
                <div>{formatTimestamp(compareWith.timestamp)}</div>
              </div>
              <div className="comparison-arrow">→</div>
              <div className="to-checkpoint">
                <h4>{selectedCheckpoint.name}</h4>
                <div>{formatTimestamp(selectedCheckpoint.timestamp)}</div>
              </div>
            </div>
            
            {/* Diff visualization would go here */}
            <div className="diff-summary">
              <div>Duration: {formatDuration(selectedCheckpoint.timestamp - compareWith.timestamp)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckpointTimeline;