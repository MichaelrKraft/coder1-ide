/**
 * Mission Control Type Definitions
 * Central command center for Coder1 IDE operations
 */

/**
 * Available Mission Control module identifiers
 */
export type MCModuleId = 'browser' | 'artifacts' | 'agents' | 'feedback';

/**
 * Mission Control module configuration
 */
export interface MCModule {
  /** Unique identifier for the module */
  id: MCModuleId;
  /** Display label for the module */
  label: string;
  /** Icon identifier (Lucide icon name or custom) */
  icon: string;
  /** React component to render for this module */
  component: React.ComponentType<any>;
  /** Whether the module is currently enabled */
  enabled: boolean;
}

/**
 * Mission Control global state
 */
export interface MCState {
  /** Currently active module */
  activeModule: MCModuleId | null;
  /** Whether Mission Control is in full-screen mode */
  isFullScreen: boolean;
  /** Content to display in the details panel */
  detailsPanelContent: React.ReactNode | null;
}

/**
 * Browser automation session
 */
export interface BrowserSession {
  /** Unique session identifier */
  id: string;
  /** Current session status */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  /** URL of the last captured screenshot */
  lastScreenshot?: string;
  /** Command execution history */
  history: BrowserCommand[];
}

/**
 * Browser automation command
 */
export interface BrowserCommand {
  /** Unique command identifier */
  id: string;
  /** Command type (navigate, click, fill, etc.) */
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'custom';
  /** User input or command description */
  input: string;
  /** Command execution result */
  result?: CommandResult;
  /** Timestamp when command was executed */
  timestamp: Date;
}

/**
 * Result of a browser command execution
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Screenshot URL if captured */
  screenshot?: string;
  /** Error message if command failed */
  error?: string;
  /** Generated Playwright code for this command */
  playwrightCode?: string;
}

/**
 * Artifact type for Mission Control gallery
 */
export type ArtifactType = 'video' | 'trace' | 'screenshot' | 'document' | 'code';

/**
 * Generated artifact from IDE operations
 */
export interface Artifact {
  /** Unique artifact identifier */
  id: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Display name */
  name: string;
  /** File system path or URL */
  path: string;
  /** Size in bytes */
  size: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Additional metadata */
  metadata?: {
    /** Associated test ID if applicable */
    testId?: string;
    /** Duration in seconds for videos */
    duration?: number;
    /** Dimensions for images and videos */
    dimensions?: { width: number; height: number };
    /** MIME type */
    mimeType?: string;
    /** Description or context */
    description?: string;
  };
}

/**
 * Artifact filter options
 */
export interface ArtifactFilter {
  /** Filter by artifact type */
  type?: ArtifactType;
  /** Filter by date range - start date */
  startDate?: Date;
  /** Filter by date range - end date */
  endDate?: Date;
  /** Filter by minimum size in bytes */
  minSize?: number;
  /** Filter by maximum size in bytes */
  maxSize?: number;
  /** Filter by test ID */
  testId?: string;
}

/**
 * Artifact statistics summary
 */
export interface ArtifactStats {
  /** Total number of artifacts */
  total: number;
  /** Count by artifact type */
  byType: Record<ArtifactType, number>;
  /** Total storage size in bytes */
  totalSize: number;
  /** Average artifact size in bytes */
  averageSize: number;
  /** Most recent artifact creation date */
  lastCreated?: Date;
}

/**
 * Agent configuration and status
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Agent role or specialty */
  role: string;
  /** Current agent status */
  status: 'idle' | 'active' | 'busy' | 'error';
  /** Capabilities this agent provides */
  capabilities: string[];
  /** Last activity timestamp */
  lastActivity?: Date;
}

/**
 * User feedback submission
 */
export interface FeedbackSubmission {
  /** Unique feedback identifier */
  id: string;
  /** Feedback type */
  type: 'bug' | 'feature' | 'improvement' | 'question';
  /** User's feedback message */
  message: string;
  /** Optional screenshot or file attachments */
  attachments?: string[];
  /** Submission timestamp */
  timestamp: Date;
  /** User email (optional) */
  email?: string;
  /** Current IDE state snapshot (optional) */
  context?: Record<string, any>;
}
