import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  memo, 
  forwardRef 
} from 'react';
import { useDesignTokens } from './useDesignTokens';
import useMemoryMonitor from '../hooks/useMemoryMonitor';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';
import { useGarbageCollection } from '../hooks/useGarbageCollection';
import './PerformanceDashboard.css';

// Performance metric interface
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold?: {
    warning: number;
    critical: number;
  };
  history?: number[];
  timestamp: Date;
  category: 'memory' | 'rendering' | 'network' | 'cpu' | 'storage';
}

// Performance alert interface
export interface PerformanceAlert {
  id: string;
  metric: string;
  level: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved?: boolean;
}

// Dashboard configuration
export interface DashboardConfig {
  refreshInterval: number; // ms
  historyLength: number; // number of data points to keep
  alertThresholds: Record<string, { warning: number; critical: number }>;
  enabledMetrics: string[];
  compactMode: boolean;
}

// Performance dashboard props
export interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<DashboardConfig>;
  onMetricClick?: (metric: PerformanceMetric) => void;
  onAlertDismiss?: (alert: PerformanceAlert) => void;
  className?: string;
}

// Default configuration
const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 1000,
  historyLength: 60,
  alertThresholds: {
    'heap-used': { warning: 50, critical: 80 }, // MB
    'heap-total': { warning: 100, critical: 200 }, // MB
    'dom-nodes': { warning: 1000, critical: 5000 },
    'event-listeners': { warning: 100, critical: 500 },
    'render-time': { warning: 16.67, critical: 33.33 }, // ms (60fps, 30fps)
    'memory-usage': { warning: 70, critical: 90 } // percentage
  },
  enabledMetrics: [
    'heap-used', 
    'heap-total', 
    'dom-nodes', 
    'event-listeners', 
    'render-time',
    'memory-usage'
  ],
  compactMode: false
};

// Performance dashboard component
const PerformanceDashboard = memo(forwardRef<HTMLDivElement, PerformanceDashboardProps>(({
  isOpen,
  onClose,
  config: userConfig = {},
  onMetricClick,
  onAlertDismiss,
  className = ''
}, ref) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsHistoryRef = useRef<Map<string, number[]>>(new Map());
  
  const { colors, getSpacing, tokens } = useDesignTokens();
  const memoryInfo = useMemoryMonitor();
  const performanceInfo = usePerformanceMonitor('PerformanceDashboard');
  
  // Merge user config with defaults
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig,
    alertThresholds: {
      ...DEFAULT_CONFIG.alertThresholds,
      ...userConfig.alertThresholds
    }
  }), [userConfig]);
  
  // Garbage collection for cleanup
  useGarbageCollection(() => {
    setMetrics([]);
    setAlerts([]);
    setSelectedCategory(null);
    metricsHistoryRef.current.clear();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, {
    componentName: 'PerformanceDashboard',
    priority: 'high'
  });
  
  // Collect performance metrics
  const collectMetrics = useCallback((): PerformanceMetric[] => {
    const now = new Date();
    const newMetrics: PerformanceMetric[] = [];
    
    // Memory metrics
    if (memoryInfo && memoryInfo.memoryUsage.length > 0) {
      const latestMemory = memoryInfo.memoryUsage[memoryInfo.memoryUsage.length - 1];
      const heapUsed = (latestMemory.usedJSMemorySize || 0) / (1024 * 1024); // MB
      const heapTotal = (latestMemory.totalJSMemorySize || 0) / (1024 * 1024); // MB
      const memoryUsage = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0; // percentage
      
      newMetrics.push({
        id: 'heap-used',
        name: 'Heap Used',
        value: heapUsed,
        unit: 'MB',
        status: heapUsed > config.alertThresholds['heap-used'].critical ? 'critical' : 
                heapUsed > config.alertThresholds['heap-used'].warning ? 'warning' : 'good',
        threshold: config.alertThresholds['heap-used'],
        timestamp: now,
        category: 'memory'
      });
      
      newMetrics.push({
        id: 'heap-total',
        name: 'Heap Total',
        value: heapTotal,
        unit: 'MB',
        status: heapTotal > config.alertThresholds['heap-total'].critical ? 'critical' : 
                heapTotal > config.alertThresholds['heap-total'].warning ? 'warning' : 'good',
        threshold: config.alertThresholds['heap-total'],
        timestamp: now,
        category: 'memory'
      });
      
      newMetrics.push({
        id: 'memory-usage',
        name: 'Memory Usage',
        value: memoryUsage,
        unit: '%',
        status: memoryUsage > config.alertThresholds['memory-usage'].critical ? 'critical' : 
                memoryUsage > config.alertThresholds['memory-usage'].warning ? 'warning' : 'good',
        threshold: config.alertThresholds['memory-usage'],
        timestamp: now,
        category: 'memory'
      });
    }
    
    // DOM metrics
    const domNodes = document.querySelectorAll('*').length;
    newMetrics.push({
      id: 'dom-nodes',
      name: 'DOM Nodes',
      value: domNodes,
      unit: 'nodes',
      status: domNodes > config.alertThresholds['dom-nodes'].critical ? 'critical' : 
              domNodes > config.alertThresholds['dom-nodes'].warning ? 'warning' : 'good',
      threshold: config.alertThresholds['dom-nodes'],
      timestamp: now,
      category: 'rendering'
    });
    
    // Event listeners (approximation)
    const eventListeners = Array.from(document.querySelectorAll('*'))
      .reduce((count, element) => {
        return count + Object.getOwnPropertyNames(element)
          .filter(prop => prop.startsWith('on')).length;
      }, 0);
    
    newMetrics.push({
      id: 'event-listeners',
      name: 'Event Listeners',
      value: eventListeners,
      unit: 'listeners',
      status: eventListeners > config.alertThresholds['event-listeners'].critical ? 'critical' : 
              eventListeners > config.alertThresholds['event-listeners'].warning ? 'warning' : 'good',
      threshold: config.alertThresholds['event-listeners'],
      timestamp: now,
      category: 'rendering'
    });
    
    // Performance metrics
    if (performanceInfo) {
      const renderTime = performanceInfo.renderTime || 0;
      newMetrics.push({
        id: 'render-time',
        name: 'Render Time',
        value: renderTime,
        unit: 'ms',
        status: renderTime > config.alertThresholds['render-time'].critical ? 'critical' : 
                renderTime > config.alertThresholds['render-time'].warning ? 'warning' : 'good',
        threshold: config.alertThresholds['render-time'],
        timestamp: now,
        category: 'rendering'
      });
    }
    
    // Add history to metrics
    newMetrics.forEach(metric => {
      const history = metricsHistoryRef.current.get(metric.id) || [];
      history.push(metric.value);
      if (history.length > config.historyLength) {
        history.shift();
      }
      metricsHistoryRef.current.set(metric.id, history);
      metric.history = [...history];
    });
    
    return newMetrics.filter(metric => config.enabledMetrics.includes(metric.id));
  }, [memoryInfo, performanceInfo, config]);
  
  // Check for alerts
  const checkAlerts = useCallback((metrics: PerformanceMetric[]) => {
    const newAlerts: PerformanceAlert[] = [];
    
    metrics.forEach(metric => {
      if (metric.threshold) {
        if (metric.value > metric.threshold.critical) {
          newAlerts.push({
            id: `${metric.id}-critical-${Date.now()}`,
            metric: metric.name,
            level: 'critical',
            message: `${metric.name} is critically high: ${metric.value.toFixed(2)} ${metric.unit}`,
            timestamp: new Date()
          });
        } else if (metric.value > metric.threshold.warning) {
          newAlerts.push({
            id: `${metric.id}-warning-${Date.now()}`,
            metric: metric.name,
            level: 'warning',
            message: `${metric.name} is above warning threshold: ${metric.value.toFixed(2)} ${metric.unit}`,
            timestamp: new Date()
          });
        }
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        const combined = [...newAlerts, ...prev];
        // Keep only recent alerts (last 50)
        return combined.slice(0, 50);
      });
    }
  }, []);
  
  // Update metrics
  const updateMetrics = useCallback(() => {
    if (!isRecording) return;
    
    const newMetrics = collectMetrics();
    setMetrics(newMetrics);
    checkAlerts(newMetrics);
  }, [collectMetrics, checkAlerts, isRecording]);
  
  // Start/stop monitoring
  useEffect(() => {
    if (isOpen && isRecording) {
      updateMetrics(); // Initial update
      intervalRef.current = setInterval(updateMetrics, config.refreshInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, isRecording, updateMetrics, config.refreshInterval]);
  
  // Filter metrics by category
  const filteredMetrics = useMemo(() => {
    if (!selectedCategory) return metrics;
    return metrics.filter(metric => metric.category === selectedCategory);
  }, [metrics, selectedCategory]);
  
  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set(metrics.map(metric => metric.category));
    return Array.from(categorySet);
  }, [metrics]);
  
  // Handle alert dismissal
  const handleAlertDismiss = useCallback((alert: PerformanceAlert) => {
    setAlerts(prev => prev.map(a => 
      a.id === alert.id ? { ...a, resolved: true } : a
    ));
    onAlertDismiss?.(alert);
  }, [onAlertDismiss]);
  
  // Handle metric click
  const handleMetricClick = useCallback((metric: PerformanceMetric) => {
    onMetricClick?.(metric);
  }, [onMetricClick]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, onClose]);
  
  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className="performance-dashboard-overlay" onClick={onClose}>
      <div
        ref={ref}
        className={`performance-dashboard ${config.compactMode ? 'performance-dashboard--compact' : ''} ${className}`}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: tokens.borderRadius.lg,
          boxShadow: tokens.shadows.xl,
          color: colors.textPrimary
        }}
      >
        {/* Header */}
        <div
          className="performance-dashboard__header"
          style={{
            borderBottom: `1px solid ${colors.borderSubtle}`,
            padding: getSpacing(4)
          }}
        >
          <div className="performance-dashboard__title">
            <h2 style={{
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.semibold,
              margin: 0,
              color: colors.textPrimary
            }}>
              📊 Performance Monitor
            </h2>
            <p style={{
              fontSize: tokens.typography.fontSize.sm,
              color: colors.textSecondary,
              margin: `${getSpacing(1)} 0 0 0`
            }}>
              Real-time system performance metrics
            </p>
          </div>
          
          <div className="performance-dashboard__controls" style={{ display: 'flex', gap: getSpacing(2) }}>
            <button
              onClick={() => setIsRecording(!isRecording)}
              style={{
                padding: `${getSpacing(1)} ${getSpacing(3)}`,
                borderRadius: tokens.borderRadius.base,
                border: `1px solid ${colors.border}`,
                backgroundColor: isRecording ? colors.success : colors.surface,
                color: isRecording ? '#ffffff' : colors.textPrimary,
                cursor: 'pointer',
                fontSize: tokens.typography.fontSize.xs
              }}
            >
              {isRecording ? '⏸️ Pause' : '▶️ Record'}
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textSecondary,
                cursor: 'pointer',
                padding: getSpacing(2),
                borderRadius: tokens.borderRadius.base
              }}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        
        {/* Alerts */}
        {alerts.filter(alert => !alert.resolved).length > 0 && (
          <div
            className="performance-dashboard__alerts"
            style={{
              borderBottom: `1px solid ${colors.borderSubtle}`,
              padding: getSpacing(3),
              backgroundColor: 'rgba(255, 193, 7, 0.1)'
            }}
          >
            <h3 style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              margin: `0 0 ${getSpacing(2)} 0`,
              color: colors.textPrimary
            }}>
              🚨 Active Alerts
            </h3>
            {alerts.filter(alert => !alert.resolved).slice(0, 3).map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onDismiss={() => handleAlertDismiss(alert)}
              />
            ))}
          </div>
        )}
        
        {/* Category filter */}
        <div
          className="performance-dashboard__filters"
          style={{
            padding: getSpacing(3),
            borderBottom: `1px solid ${colors.borderSubtle}`
          }}
        >
          <div style={{ display: 'flex', gap: getSpacing(2), flexWrap: 'wrap' }}>
            <CategoryButton
              active={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
            >
              All ({metrics.length})
            </CategoryButton>
            {categories.map(category => {
              const count = metrics.filter(m => m.category === category).length;
              return (
                <CategoryButton
                  key={category}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({count})
                </CategoryButton>
              );
            })}
          </div>
        </div>
        
        {/* Metrics grid */}
        <div
          className="performance-dashboard__content"
          style={{
            padding: getSpacing(4),
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          {filteredMetrics.length === 0 ? (
            <div
              className="performance-dashboard__empty"
              style={{
                textAlign: 'center',
                color: colors.textSecondary,
                padding: getSpacing(8)
              }}
            >
              No metrics available for the selected category.
            </div>
          ) : (
            <div
              className="performance-dashboard__metrics"
              style={{
                display: 'grid',
                gridTemplateColumns: config.compactMode ? 
                  'repeat(auto-fill, minmax(200px, 1fr))' : 
                  'repeat(auto-fill, minmax(280px, 1fr))',
                gap: getSpacing(4)
              }}
            >
              {filteredMetrics.map(metric => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  compact={config.compactMode}
                  onClick={() => handleMetricClick(metric)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div
          className="performance-dashboard__footer"
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            padding: getSpacing(3),
            fontSize: tokens.typography.fontSize.xs,
            color: colors.textTertiary,
            textAlign: 'center'
          }}
        >
          Last updated: {metrics.length > 0 ? metrics[0].timestamp.toLocaleTimeString() : 'Never'} • 
          Press <kbd style={{ 
            background: colors.surface, 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontFamily: tokens.typography.fontFamily.mono.join(', ')
          }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}));

// Individual metric card component
const MetricCard = memo(({
  metric,
  compact,
  onClick
}: {
  metric: PerformanceMetric;
  compact: boolean;
  onClick: () => void;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  const statusColors = {
    good: colors.success,
    warning: colors.warning,
    critical: colors.error
  };
  
  return (
    <div
      className={`performance-dashboard__metric ${compact ? 'performance-dashboard__metric--compact' : ''}`}
      onClick={onClick}
      style={{
        padding: getSpacing(compact ? 3 : 4),
        backgroundColor: colors.surface,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: tokens.borderRadius.base,
        cursor: 'pointer',
        transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.out}`,
        borderLeftColor: statusColors[metric.status],
        borderLeftWidth: '3px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.surfaceHover;
        e.currentTarget.style.borderColor = colors.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.surface;
        e.currentTarget.style.borderColor = colors.borderSubtle;
      }}
    >
      {/* Metric header */}
      <div className="performance-dashboard__metric-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: getSpacing(2)
      }}>
        <span style={{
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.medium,
          color: colors.textPrimary
        }}>
          {metric.name}
        </span>
        <StatusIndicator status={metric.status} />
      </div>
      
      {/* Metric value */}
      <div className="performance-dashboard__metric-value" style={{
        fontSize: compact ? tokens.typography.fontSize.lg : tokens.typography.fontSize.xl,
        fontWeight: tokens.typography.fontWeight.bold,
        color: statusColors[metric.status],
        marginBottom: getSpacing(1)
      }}>
        {metric.value.toFixed(metric.unit === '%' ? 1 : 2)} {metric.unit}
      </div>
      
      {/* Threshold info */}
      {metric.threshold && !compact && (
        <div className="performance-dashboard__metric-threshold" style={{
          fontSize: tokens.typography.fontSize.xs,
          color: colors.textTertiary,
          marginBottom: getSpacing(2)
        }}>
          Warning: {metric.threshold.warning} • Critical: {metric.threshold.critical}
        </div>
      )}
      
      {/* Mini chart */}
      {metric.history && metric.history.length > 1 && (
        <div className="performance-dashboard__metric-chart" style={{
          height: compact ? '20px' : '30px',
          marginTop: getSpacing(2)
        }}>
          <MiniChart 
            data={metric.history} 
            color={statusColors[metric.status]}
            height={compact ? 20 : 30}
          />
        </div>
      )}
    </div>
  );
});

// Alert item component
const AlertItem = memo(({
  alert,
  onDismiss
}: {
  alert: PerformanceAlert;
  onDismiss: () => void;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  const alertColors = {
    warning: colors.warning,
    critical: colors.error
  };
  
  return (
    <div
      className="performance-dashboard__alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: getSpacing(2),
        marginBottom: getSpacing(1),
        backgroundColor: colors.surface,
        borderRadius: tokens.borderRadius.base,
        border: `1px solid ${alertColors[alert.level]}`,
        borderLeftWidth: '3px'
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: tokens.typography.fontSize.xs,
          fontWeight: tokens.typography.fontWeight.medium,
          color: alertColors[alert.level],
          textTransform: 'uppercase',
          marginBottom: getSpacing(1)
        }}>
          {alert.level}
        </div>
        <div style={{
          fontSize: tokens.typography.fontSize.sm,
          color: colors.textPrimary
        }}>
          {alert.message}
        </div>
        <div style={{
          fontSize: tokens.typography.fontSize.xs,
          color: colors.textTertiary,
          marginTop: getSpacing(1)
        }}>
          {alert.timestamp.toLocaleTimeString()}
        </div>
      </div>
      
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          padding: getSpacing(1),
          borderRadius: tokens.borderRadius.base
        }}
        title="Dismiss alert"
      >
        <CloseIcon />
      </button>
    </div>
  );
});

// Category button component
const CategoryButton = memo(({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${getSpacing(1)} ${getSpacing(3)}`,
        borderRadius: tokens.borderRadius.base,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        backgroundColor: active ? colors.primary : colors.surface,
        color: active ? '#ffffff' : colors.textSecondary,
        cursor: 'pointer',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.medium,
        transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.out}`,
        textTransform: 'capitalize'
      }}
    >
      {children}
    </button>
  );
});

// Status indicator component
const StatusIndicator = memo(({ status }: { status: 'good' | 'warning' | 'critical' }) => {
  const { colors } = useDesignTokens();
  
  const statusColors = {
    good: colors.success,
    warning: colors.warning,
    critical: colors.error
  };
  
  const statusIcons = {
    good: '✅',
    warning: '⚠️',
    critical: '🚨'
  };
  
  return (
    <div
      className="performance-dashboard__status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: statusColors[status]
      }}
      title={`Status: ${status}`}
    >
      <span>{statusIcons[status]}</span>
    </div>
  );
});

// Mini chart component for metric history
const MiniChart = memo(({
  data,
  color,
  height
}: {
  data: number[];
  color: string;
  height: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || data.length < 2) return;
    
    const svg = svgRef.current;
    const width = svg.clientWidth;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Calculate dimensions
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Find min/max values
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const valueRange = maxValue - minValue || 1;
    
    // Create path
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });
    
    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${points.join(' L ')}`);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.8');
    
    // Create area fill
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const areaPoints = [
      `${padding},${padding + chartHeight}`,
      ...points,
      `${padding + chartWidth},${padding + chartHeight}`
    ];
    areaPath.setAttribute('d', `M ${areaPoints.join(' L ')} Z`);
    areaPath.setAttribute('fill', color);
    areaPath.setAttribute('opacity', '0.1');
    
    svg.appendChild(areaPath);
    svg.appendChild(path);
  }, [data, color, height]);
  
  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      style={{
        display: 'block',
        overflow: 'visible'
      }}
    />
  );
});

// Close icon component
const CloseIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
));

// Display names for debugging
PerformanceDashboard.displayName = 'PerformanceDashboard';
AlertItem.displayName = 'AlertItem';
CategoryButton.displayName = 'CategoryButton';
StatusIndicator.displayName = 'StatusIndicator';
MiniChart.displayName = 'MiniChart';
CloseIcon.displayName = 'CloseIcon';

export default PerformanceDashboard;