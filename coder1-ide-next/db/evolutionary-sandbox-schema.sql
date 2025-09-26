-- Evolutionary Sandbox Memory System Database Extensions
-- Extends existing context-memory database with sandbox experiment tracking

-- Sandbox Experiments - Track all AI-suggested experiments
CREATE TABLE IF NOT EXISTS sandbox_experiments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default-user',
    project_path TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    suggestion_text TEXT NOT NULL,
    suggestion_hash TEXT NOT NULL, -- MD5 of suggestion for duplicate detection
    confidence_score REAL NOT NULL DEFAULT 0.5, -- 0.0 to 1.0 predicted success
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK(risk_level IN ('low', 'medium', 'high')),
    experiment_type TEXT NOT NULL DEFAULT 'general' CHECK(experiment_type IN (
        'general', 'file_modification', 'dependency_change', 'config_update', 
        'refactoring', 'testing', 'deployment', 'security_fix'
    )),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    outcome TEXT NOT NULL DEFAULT 'pending' CHECK(outcome IN (
        'pending', 'running', 'success', 'failure', 'abandoned', 'timeout'
    )),
    graduated BOOLEAN DEFAULT FALSE,
    graduation_decision TEXT NULL CHECK(graduation_decision IN ('accept', 'reject')),
    graduation_reason TEXT NULL,
    graduation_at DATETIME NULL,
    files_modified TEXT NULL, -- JSON array of files touched
    commands_run TEXT NULL, -- JSON array of commands executed
    error_messages TEXT NULL, -- JSON array of errors encountered
    success_metrics TEXT NULL, -- JSON object with success indicators
    execution_time_ms INTEGER DEFAULT 0,
    memory_created INTEGER DEFAULT 0 -- Number of memory entries created
);

-- Experiment Memory Contexts - Isolated memories per sandbox experiment
CREATE TABLE IF NOT EXISTS experiment_memories (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    conversation_id TEXT NULL, -- Links to claude_conversations if applicable
    memory_type TEXT NOT NULL CHECK(memory_type IN (
        'conversation', 'command_result', 'file_change', 'error_encounter', 
        'success_pattern', 'lesson_learned'
    )),
    content TEXT NOT NULL,
    context_data TEXT NULL, -- JSON with additional context
    relevance_score REAL NOT NULL DEFAULT 0.5,
    isolation_level TEXT NOT NULL DEFAULT 'sandbox' CHECK(isolation_level IN (
        'sandbox', 'experiment', 'global'
    )),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graduated_to_main BOOLEAN DEFAULT FALSE,
    graduation_date DATETIME NULL,
    FOREIGN KEY (experiment_id) REFERENCES sandbox_experiments(id) ON DELETE CASCADE
);

-- Memory Graduation History - Track what memories got promoted/rejected
CREATE TABLE IF NOT EXISTS memory_graduation (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    graduation_type TEXT NOT NULL CHECK(graduation_type IN ('promote', 'reject')),
    decision_reason TEXT NOT NULL,
    human_decision BOOLEAN DEFAULT TRUE, -- FALSE if auto-decided by system
    confidence_threshold REAL NULL, -- Threshold used for auto-decisions
    graduated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    promoted_to_session_id TEXT NULL, -- If promoted, which main session got it
    FOREIGN KEY (experiment_id) REFERENCES sandbox_experiments(id) ON DELETE CASCADE,
    FOREIGN KEY (memory_id) REFERENCES experiment_memories(id) ON DELETE CASCADE
);

-- Confidence Scoring Patterns - Learn what makes experiments successful
CREATE TABLE IF NOT EXISTS confidence_patterns (
    id TEXT PRIMARY KEY,
    pattern_name TEXT NOT NULL UNIQUE,
    pattern_description TEXT NOT NULL,
    pattern_regex TEXT NULL, -- Regex to match suggestions
    success_rate REAL NOT NULL DEFAULT 0.5, -- Historical success rate
    total_experiments INTEGER DEFAULT 0,
    successful_experiments INTEGER DEFAULT 0,
    failed_experiments INTEGER DEFAULT 0,
    risk_multiplier REAL DEFAULT 1.0, -- Adjust confidence based on risk
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    pattern_weight REAL DEFAULT 1.0, -- How much this pattern influences final confidence
    metadata TEXT NULL -- JSON with additional pattern data
);

-- Sandbox Sessions - Track sandbox environment details
CREATE TABLE IF NOT EXISTS sandbox_sessions (
    id TEXT PRIMARY KEY, -- Same as Enhanced tmux sandbox ID
    user_id TEXT NOT NULL DEFAULT 'default-user',
    project_path TEXT NOT NULL,
    tmux_session_name TEXT NOT NULL,
    workspace_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'creating' CHECK(status IN (
        'creating', 'ready', 'running', 'stopped', 'error', 'destroyed'
    )),
    resource_limits TEXT NULL, -- JSON with CPU/memory/disk limits
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    destroyed_at DATETIME NULL,
    experiment_count INTEGER DEFAULT 0,
    memory_count INTEGER DEFAULT 0
);

-- Experiment Outcomes Analysis - Track patterns in failures and successes
CREATE TABLE IF NOT EXISTS outcome_analysis (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL CHECK(analysis_type IN (
        'success_factor', 'failure_cause', 'performance_metric', 'user_satisfaction'
    )),
    analysis_data TEXT NOT NULL, -- JSON with detailed analysis
    confidence_impact REAL DEFAULT 0.0, -- How this should adjust future confidence scores
    pattern_learned TEXT NULL, -- If a new pattern was discovered
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES sandbox_experiments(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_user_id ON sandbox_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_project_path ON sandbox_experiments(project_path);
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_outcome ON sandbox_experiments(outcome);
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_created_at ON sandbox_experiments(created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_confidence ON sandbox_experiments(confidence_score);
CREATE INDEX IF NOT EXISTS idx_sandbox_experiments_hash ON sandbox_experiments(suggestion_hash);

CREATE INDEX IF NOT EXISTS idx_experiment_memories_experiment_id ON experiment_memories(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_memories_type ON experiment_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_experiment_memories_graduated ON experiment_memories(graduated_to_main);

CREATE INDEX IF NOT EXISTS idx_memory_graduation_experiment_id ON memory_graduation(experiment_id);
CREATE INDEX IF NOT EXISTS idx_memory_graduation_type ON memory_graduation(graduation_type);

CREATE INDEX IF NOT EXISTS idx_confidence_patterns_success_rate ON confidence_patterns(success_rate);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_user_id ON sandbox_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_status ON sandbox_sessions(status);

CREATE INDEX IF NOT EXISTS idx_outcome_analysis_experiment_id ON outcome_analysis(experiment_id);
CREATE INDEX IF NOT EXISTS idx_outcome_analysis_type ON outcome_analysis(analysis_type);

-- Views for common evolutionary sandbox queries
CREATE VIEW IF NOT EXISTS experiment_success_rates AS
SELECT 
    experiment_type,
    risk_level,
    COUNT(*) as total_experiments,
    COUNT(CASE WHEN outcome = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failed,
    ROUND(
        CAST(COUNT(CASE WHEN outcome = 'success' THEN 1 END) AS REAL) / 
        CAST(COUNT(*) AS REAL) * 100, 2
    ) as success_rate_percent,
    AVG(confidence_score) as avg_predicted_confidence,
    AVG(execution_time_ms) as avg_execution_time
FROM sandbox_experiments 
WHERE outcome IN ('success', 'failure')
GROUP BY experiment_type, risk_level;

CREATE VIEW IF NOT EXISTS recent_experiments AS
SELECT 
    se.*,
    ss.workspace_path,
    ss.tmux_session_name,
    COUNT(em.id) as memory_count,
    COUNT(CASE WHEN em.graduated_to_main = 1 THEN 1 END) as graduated_memories
FROM sandbox_experiments se
LEFT JOIN sandbox_sessions ss ON se.sandbox_id = ss.id
LEFT JOIN experiment_memories em ON se.id = em.experiment_id
GROUP BY se.id
ORDER BY se.created_at DESC;

CREATE VIEW IF NOT EXISTS confidence_accuracy AS
SELECT 
    ROUND(confidence_score, 1) as confidence_bucket,
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN outcome = 'success' THEN 1 END) as actual_successes,
    ROUND(
        CAST(COUNT(CASE WHEN outcome = 'success' THEN 1 END) AS REAL) / 
        CAST(COUNT(*) AS REAL) * 100, 2
    ) as actual_success_rate,
    ROUND(confidence_score * 100, 1) as predicted_success_rate,
    ABS(ROUND(confidence_score * 100, 1) - ROUND(
        CAST(COUNT(CASE WHEN outcome = 'success' THEN 1 END) AS REAL) / 
        CAST(COUNT(*) AS REAL) * 100, 2
    )) as accuracy_error
FROM sandbox_experiments 
WHERE outcome IN ('success', 'failure')
GROUP BY ROUND(confidence_score, 1)
ORDER BY confidence_bucket;

-- Initial confidence patterns - seed data based on common development patterns
INSERT OR IGNORE INTO confidence_patterns (pattern_name, pattern_description, pattern_regex, success_rate, pattern_weight) VALUES
('simple_file_edit', 'Single file modifications without dependencies', '(edit|modify|change|update).*single.*file', 0.85, 1.2),
('package_install', 'Installing npm packages or dependencies', '(npm install|add package|install.*dependency)', 0.75, 1.0),
('config_update', 'Configuration file changes', '(config|\.json|\.yaml|\.yml|settings).*update', 0.70, 1.1),
('refactor_small', 'Small refactoring operations', 'refactor.*(function|method|component)', 0.65, 1.0),
('test_addition', 'Adding or modifying tests', '(test|spec|jest|cypress).*add', 0.80, 1.1),
('database_migration', 'Database schema changes', '(migration|schema|database).*change', 0.45, 0.8),
('deployment_change', 'Deployment configuration changes', '(deploy|docker|kubernetes).*config', 0.40, 0.7),
('security_fix', 'Security-related modifications', '(security|auth|permission).*fix', 0.55, 0.9),
('api_endpoint', 'Adding or modifying API endpoints', '(api|endpoint|route).*add', 0.60, 1.0),
('ui_component', 'UI component creation or modification', '(component|ui|interface).*create', 0.70, 1.0);

-- System metadata
INSERT OR IGNORE INTO sandbox_experiments (id, user_id, project_path, sandbox_id, suggestion_text, suggestion_hash, confidence_score, experiment_type, outcome)
VALUES ('system_init', 'system', '/system', 'system', 'Evolutionary Sandbox Memory System Initialized', 'system_init_hash', 1.0, 'general', 'success');