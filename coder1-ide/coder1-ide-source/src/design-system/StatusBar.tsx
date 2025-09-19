import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  memo, 
  forwardRef 
} from 'react';
import { useDesignTokens } from './useDesignTokens';
import { useGarbageCollection } from '../hooks/useGarbageCollection';
import './StatusBar.css';

// Status item interface
export interface StatusItem {
  id: string;
  label: string;
  value?: string | number;
  status?: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  tooltip?: string;
  icon?: React.ReactNode;
  priority?: number; // Higher priority items appear first
  action?: () => void;
  progress?: number; // 0-100 for progress indicators
  timestamp?: Date;
}

// Status section for grouping related items
export interface StatusSection {
  id: string;
  title: string;
  items: StatusItem[];
  collapsible?: boolean;
  collapsed?: boolean;
  priority?: number;
}

// Status bar props
export interface StatusBarProps {
  items?: StatusItem[];
  sections?: StatusSection[];
  position?: 'top' | 'bottom';
  compact?: boolean;
  showProgress?: boolean;
  showTimestamp?: boolean;
  maxItems?: number;
  className?: string;
  onItemClick?: (item: StatusItem) => void;
  onSectionToggle?: (sectionId: string, collapsed: boolean) => void;
}

// Status bar component
const StatusBar = memo(forwardRef<HTMLDivElement, StatusBarProps>(({
  items = [],
  sections = [],
  position = 'bottom',
  compact = false,
  showProgress = true,
  showTimestamp = false,
  maxItems = 8,
  className = '',
  onItemClick,
  onSectionToggle
}, ref) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [recentItems, setRecentItems] = useState<StatusItem[]>([]);
  
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  // Garbage collection for cleanup
  useGarbageCollection(() => {
    setCollapsedSections(new Set());
    setRecentItems([]);
  }, {
    componentName: 'StatusBar',
    priority: 'low'
  });
  
  // Combine all items from props and sections
  const allItems = useMemo(() => {
    const combinedItems = [...items];
    
    sections.forEach(section => {
      if (!collapsedSections.has(section.id)) {
        combinedItems.push(...section.items.map(item => ({
          ...item,
          section: section.title
        })));
      }
    });
    
    return combinedItems
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, maxItems);
  }, [items, sections, collapsedSections, maxItems]);
  
  // Handle section toggle
  const handleSectionToggle = useCallback((sectionId: string) => {
    const isCollapsed = collapsedSections.has(sectionId);
    const newCollapsedSections = new Set(collapsedSections);
    
    if (isCollapsed) {
      newCollapsedSections.delete(sectionId);
    } else {
      newCollapsedSections.add(sectionId);
    }
    
    setCollapsedSections(newCollapsedSections);
    onSectionToggle?.(sectionId, !isCollapsed);
  }, [collapsedSections, onSectionToggle]);
  
  // Handle item click
  const handleItemClick = useCallback((item: StatusItem) => {
    if (item.action) {
      item.action();
    }
    onItemClick?.(item);
  }, [onItemClick]);
  
  // Update recent items for timestamp display
  useEffect(() => {
    if (showTimestamp) {
      const itemsWithTimestamp = allItems.filter(item => item.timestamp);
      setRecentItems(itemsWithTimestamp.slice(0, 3));
    }
  }, [allItems, showTimestamp]);
  
  // Generate CSS classes
  const baseClasses = 'status-bar';
  const positionClass = `status-bar--${position}`;
  const compactClass = compact ? 'status-bar--compact' : '';
  
  const finalClassName = [baseClasses, positionClass, compactClass, className]
    .filter(Boolean)
    .join(' ');
  
  // Calculate overall status
  const overallStatus = useMemo(() => {
    const hasError = allItems.some(item => item.status === 'error');
    const hasWarning = allItems.some(item => item.status === 'warning');
    const hasLoading = allItems.some(item => item.status === 'loading');
    
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    if (hasLoading) return 'loading';
    return 'idle';
  }, [allItems]);
  
  return (
    <div
      ref={ref}
      className={finalClassName}
      style={{
        backgroundColor: colors.surface,
        borderTop: position === 'bottom' ? `1px solid ${colors.borderSubtle}` : 'none',
        borderBottom: position === 'top' ? `1px solid ${colors.borderSubtle}` : 'none',
        color: colors.textSecondary,
        fontSize: compact ? tokens.typography.fontSize.xs : tokens.typography.fontSize.sm
      }}
    >
      {/* Status indicator */}
      <div className="status-bar__indicator">
        <StatusIndicator status={overallStatus} />
      </div>
      
      {/* Main content */}
      <div className="status-bar__content">
        {/* Sections */}
        {sections.map(section => (
          <StatusBarSection
            key={section.id}
            section={section}
            isCollapsed={collapsedSections.has(section.id)}
            onToggle={() => handleSectionToggle(section.id)}
            onItemClick={handleItemClick}
            compact={compact}
            showProgress={showProgress}
          />
        ))}
        
        {/* Individual items */}
        {allItems.map(item => (
          <StatusBarItem
            key={item.id}
            item={item}
            onClick={() => handleItemClick(item)}
            compact={compact}
            showProgress={showProgress}
          />
        ))}
        
        {/* Recent activity */}
        {showTimestamp && recentItems.length > 0 && (
          <div className="status-bar__recent">
            <span className="status-bar__recent-label">Recent:</span>
            {recentItems.map(item => (
              <span key={item.id} className="status-bar__recent-item">
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="status-bar__actions">
        <StatusBarActions items={allItems} />
      </div>
    </div>
  );
}));

// Status bar section component
const StatusBarSection = memo(({
  section,
  isCollapsed,
  onToggle,
  onItemClick,
  compact,
  showProgress
}: {
  section: StatusSection;
  isCollapsed: boolean;
  onToggle: () => void;
  onItemClick: (item: StatusItem) => void;
  compact: boolean;
  showProgress: boolean;
}) => {
  const { colors, getSpacing } = useDesignTokens();
  
  if (!section.collapsible) {
    return (
      <div className="status-bar__section">
        <span className="status-bar__section-title">{section.title}</span>
        {section.items.map(item => (
          <StatusBarItem
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
            compact={compact}
            showProgress={showProgress}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className="status-bar__section status-bar__section--collapsible">
      <button
        className="status-bar__section-toggle"
        onClick={onToggle}
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          padding: getSpacing(1)
        }}
      >
        <span className="status-bar__section-title">{section.title}</span>
        <ChevronIcon collapsed={isCollapsed} />
      </button>
      
      {!isCollapsed && (
        <div className="status-bar__section-items">
          {section.items.map(item => (
            <StatusBarItem
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
              compact={compact}
              showProgress={showProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Individual status bar item
const StatusBarItem = memo(({
  item,
  onClick,
  compact,
  showProgress
}: {
  item: StatusItem;
  onClick: () => void;
  compact: boolean;
  showProgress: boolean;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  const statusColors = {
    idle: colors.textSecondary,
    loading: colors.warning,
    success: colors.success,
    error: colors.error,
    warning: colors.warning
  };
  
  const itemStyle: React.CSSProperties = {
    color: statusColors[item.status || 'idle'],
    cursor: item.action ? 'pointer' : 'default',
    padding: getSpacing(compact ? 1 : 2),
    borderRadius: tokens.borderRadius.base,
    transition: `background-color ${tokens.animation.duration.fast} ${tokens.animation.easing.out}`
  };
  
  if (item.action) {
    itemStyle.backgroundColor = 'transparent';
  }
  
  return (
    <div
      className={`status-bar__item ${item.status ? `status-bar__item--${item.status}` : ''}`}
      onClick={onClick}
      title={item.tooltip}
      style={itemStyle}
      onMouseEnter={(e) => {
        if (item.action) {
          e.currentTarget.style.backgroundColor = colors.surfaceHover;
        }
      }}
      onMouseLeave={(e) => {
        if (item.action) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Icon */}
      {item.icon && (
        <span className="status-bar__item-icon">
          {item.icon}
        </span>
      )}
      
      {/* Loading spinner */}
      {item.status === 'loading' && (
        <span className="status-bar__item-spinner">
          <LoadingSpinner size="sm" />
        </span>
      )}
      
      {/* Label and value */}
      <span className="status-bar__item-content">
        <span className="status-bar__item-label">{item.label}</span>
        {item.value !== undefined && (
          <span className="status-bar__item-value">: {item.value}</span>
        )}
      </span>
      
      {/* Progress bar */}
      {showProgress && item.progress !== undefined && (
        <div className="status-bar__item-progress">
          <ProgressBar value={item.progress} size="sm" />
        </div>
      )}
    </div>
  );
});

// Status indicator component
const StatusIndicator = memo(({ status }: { status: string }) => {
  const { colors } = useDesignTokens();
  
  const statusColors = {
    idle: colors.success,
    loading: colors.warning,
    success: colors.success,
    error: colors.error,
    warning: colors.warning
  };
  
  return (
    <div
      className={`status-bar__status-indicator status-bar__status-indicator--${status}`}
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: statusColors[status as keyof typeof statusColors] || colors.textSecondary,
        animation: status === 'loading' ? 'status-pulse 2s ease-in-out infinite' : 'none'
      }}
    />
  );
});

// Status bar actions (right side)
const StatusBarActions = memo(({ items }: { items: StatusItem[] }) => {
  const { colors, getSpacing } = useDesignTokens();
  
  const errorCount = items.filter(item => item.status === 'error').length;
  const warningCount = items.filter(item => item.status === 'warning').length;
  const loadingCount = items.filter(item => item.status === 'loading').length;
  
  return (
    <div className="status-bar__action-items" style={{ display: 'flex', gap: getSpacing(3) }}>
      {errorCount > 0 && (
        <span className="status-bar__count status-bar__count--error" style={{ color: colors.error }}>
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </span>
      )}
      {warningCount > 0 && (
        <span className="status-bar__count status-bar__count--warning" style={{ color: colors.warning }}>
          {warningCount} warning{warningCount !== 1 ? 's' : ''}
        </span>
      )}
      {loadingCount > 0 && (
        <span className="status-bar__count status-bar__count--loading" style={{ color: colors.warning }}>
          {loadingCount} active
        </span>
      )}
    </div>
  );
});

// Progress bar component
const ProgressBar = memo(({ 
  value, 
  size = 'base' 
}: { 
  value: number; 
  size?: 'sm' | 'base' | 'lg' 
}) => {
  const { colors, tokens } = useDesignTokens();
  
  const heights = {
    sm: '2px',
    base: '4px',
    lg: '6px'
  };
  
  return (
    <div
      className="status-bar__progress"
      style={{
        width: '60px',
        height: heights[size],
        backgroundColor: colors.surface,
        borderRadius: tokens.borderRadius.full,
        overflow: 'hidden'
      }}
    >
      <div
        className="status-bar__progress-fill"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: tokens.borderRadius.full,
          transition: `width ${tokens.animation.duration.normal} ${tokens.animation.easing.out}`
        }}
      />
    </div>
  );
});

// Loading spinner component
const LoadingSpinner = memo(({ size = 'base' }: { size?: 'sm' | 'base' | 'lg' }) => {
  const sizes = {
    sm: '12px',
    base: '16px',
    lg: '20px'
  };
  
  return (
    <svg
      className="status-bar__spinner"
      width={sizes[size]}
      height={sizes[size]}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="31.416"
        strokeDashoffset="31.416"
        style={{
          animation: 'status-bar-spin 1s linear infinite'
        }}
      />
    </svg>
  );
});

// Chevron icon for collapsible sections
const ChevronIcon = memo(({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }}
  >
    <polyline points="6,9 12,15 18,9"></polyline>
  </svg>
));

// Display names for debugging
StatusBar.displayName = 'StatusBar';
StatusBarSection.displayName = 'StatusBarSection';
StatusBarItem.displayName = 'StatusBarItem';
StatusIndicator.displayName = 'StatusIndicator';
StatusBarActions.displayName = 'StatusBarActions';
ProgressBar.displayName = 'ProgressBar';
LoadingSpinner.displayName = 'LoadingSpinner';
ChevronIcon.displayName = 'ChevronIcon';

export default StatusBar;