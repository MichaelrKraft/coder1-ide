# Session Analysis Patterns

Pattern detection helpers for intelligent session analysis.

## Session Type Detection

### Bug Fix Pattern
```javascript
const isBugFix = (commands, files) => {
  const bugFixKeywords = ['test', 'debug', 'fix', 'error', 'failing'];
  const commandString = commands.join(' ').toLowerCase();
  
  return bugFixKeywords.some(keyword => commandString.includes(keyword));
};
```

**Indicators**:
- Commands: `npm test`, `npm run test:watch`, `jest`, `mocha`
- Files: `.test.ts`, `.spec.ts`, `__tests__/`
- Terminal: Multiple test runs, error messages
- Pattern: Repeated same command (testing fix iterations)

### Feature Development Pattern
```javascript
const isFeatureDev = (files, commands) => {
  const newFiles = files.filter(f => f.isDirty);
  const createCommands = commands.filter(c => 
    c.includes('create') || c.includes('add') || c.includes('new')
  );
  
  return newFiles.length > 3 || createCommands.length > 2;
};
```

**Indicators**:
- Many new files created
- Commands: `npm install {new-package}`, `mkdir`, `touch`
- Files: Multiple components/modules in progress
- Pattern: Expanding codebase

### Refactoring Pattern
```javascript
const isRefactoring = (commands, terminalHistory) => {
  const refactorKeywords = ['refactor', 'rename', 'optimize', 'restructure'];
  const allText = (commands.join(' ') + terminalHistory).toLowerCase();
  
  return refactorKeywords.some(keyword => allText.includes(keyword));
};
```

**Indicators**:
- Commands: `git mv`, file renames
- Files: Same logic, different structure
- Terminal: Lots of file moves/renames
- Pattern: Code improvement without new features

### Exploration Pattern
```javascript
const isExploration = (files, commands) => {
  const exploringActions = [
    'cat', 'less', 'head', 'tail',  // Reading files
    'ls', 'find', 'grep',             // Searching
    'git log', 'git show'             // Reviewing history
  ];
  
  const readCommands = commands.filter(c =>
    exploringActions.some(action => c.startsWith(action))
  );
  
  return readCommands.length > files.filter(f => f.isDirty).length;
};
```

**Indicators**:
- Many files opened, few modified
- Commands: Mostly read operations
- Pattern: More reading than writing

## Error Pattern Detection

### Syntax Errors
```regex
/(SyntaxError|Unexpected token|Unexpected identifier)/gi
```

**Context**: Usually in specific file at specific line  
**Severity**: High (blocks execution)  
**Resolution**: Quick (syntax fix)

### Type Errors (TypeScript)
```regex
/(Type '.*' is not assignable|Property '.*' does not exist)/gi
```

**Context**: TypeScript compilation  
**Severity**: Medium-High (blocks build)  
**Resolution**: Moderate (type fixing)

### Runtime Errors
```regex
/(TypeError|ReferenceError|Cannot read property)/gi
```

**Context**: During execution  
**Severity**: High (breaks functionality)  
**Resolution**: Variable (logic debugging)

### Network/API Errors
```regex
/(ECONNREFUSED|404|500|CORS|Network request failed)/gi
```

**Context**: External service calls  
**Severity**: Medium (may be temporary)  
**Resolution**: Configuration or retry

### Dependency Errors
```regex
/(Module not found|Cannot find module|ENOENT)/gi
```

**Context**: Import/require statements  
**Severity**: High (blocks execution)  
**Resolution**: `npm install` or path fix

## Success Pattern Detection

### Tests Passing
```regex
/(✓|✔|PASS|All tests passed|\d+ passing)/gi
```

**Indicator**: Test suite success  
**Action**: Highlight as breakthrough

### Build Success
```regex
/(Compiled successfully|Build succeeded|✨  Done)/gi
```

**Indicator**: Successful build  
**Action**: Note as milestone

### Git Operations Success
```regex
/(Committed|Pushed|Merge successful|\[master \w+\])/gi
```

**Indicator**: Version control success  
**Action**: Document as checkpoint

### Server Started
```regex
/(Server running|Listening on|Ready on|started server)/gi
```

**Indicator**: Development server up  
**Action**: Environment ready

## Command Pattern Analysis

### Common Command Sequences

**Test-Driven Development**:
```
npm run test
npm run test:watch
npm run test -- --coverage
```
Pattern indicates: TDD approach, quality focus

**Debugging Cycle**:
```
npm run dev
curl http://localhost:3000
npm run dev (restart)
curl http://localhost:3000
```
Pattern indicates: API testing, iterative fixes

**Build & Deploy**:
```
npm run build
npm run lint
npm test
git commit
git push
```
Pattern indicates: Production preparation

**Dependency Management**:
```
npm install
npm audit
npm audit fix
npm install {package}
```
Pattern indicates: Dependency updates/additions

## File Change Pattern Analysis

### Component Development
```javascript
const isComponentWork = (files) => {
  const componentFiles = files.filter(f =>
    f.name.endsWith('.tsx') || 
    f.name.endsWith('.jsx') ||
    f.path.includes('/components/')
  );
  
  return componentFiles.length > files.length * 0.5;
};
```

### API Development
```javascript
const isAPIWork = (files) => {
  return files.some(f =>
    f.path.includes('/api/') ||
    f.path.includes('/routes/') ||
    f.name.includes('service') ||
    f.name.includes('controller')
  );
};
```

### Styling Work
```javascript
const isStylingWork = (files) => {
  const styleFiles = files.filter(f =>
    f.name.endsWith('.css') ||
    f.name.endsWith('.scss') ||
    f.content.includes('className=') ||
    f.content.includes('styled-components')
  );
  
  return styleFiles.length > 0;
};
```

### Database Work
```javascript
const isDBWork = (files, commands) => {
  const dbIndicators = [
    'migration', 'schema', 'model', 'entity',
    'prisma', 'typeorm', 'sequelize', 'mongoose'
  ];
  
  const allText = (files.map(f => f.name).join(' ') + commands.join(' ')).toLowerCase();
  
  return dbIndicators.some(indicator => allText.includes(indicator));
};
```

## Key Decision Detection

### Architecture Decisions
```javascript
const detectArchitectureDecisions = (files, commands) => {
  const decisions = [];
  
  // New directory structure
  if (commands.some(c => c.includes('mkdir') && c.includes('src/'))) {
    decisions.push('Restructured project directories');
  }
  
  // New major dependency
  const majorPackages = ['react', 'vue', 'angular', 'next', 'express'];
  const installs = commands.filter(c => 
    c.includes('npm install') && 
    majorPackages.some(pkg => c.includes(pkg))
  );
  if (installs.length > 0) {
    decisions.push(`Added major framework: ${installs[0]}`);
  }
  
  return decisions;
};
```

### Technical Debt Recognition
```javascript
const detectTechnicalDebt = (files) => {
  const debt = [];
  
  files.forEach(file => {
    // Count TODOs
    const todos = (file.content.match(/TODO:/g) || []).length;
    if (todos > 3) {
      debt.push(`${file.name} has ${todos} TODOs`);
    }
    
    // Count FIXMEs
    const fixmes = (file.content.match(/FIXME:/g) || []).length;
    if (fixmes > 0) {
      debt.push(`${file.name} has ${fixmes} FIXMEs (urgent)`);
    }
    
    // Detect console.logs in production files
    if (!file.path.includes('test') && file.content.includes('console.log')) {
      debt.push(`${file.name} has debugging console.logs`);
    }
  });
  
  return debt;
};
```

## Blocker Detection

### Critical Blockers
```javascript
const detectBlockers = (errors, files) => {
  const blockers = [];
  
  // Build-blocking errors
  const buildErrors = errors.filter(e => 
    e.message.includes('SyntaxError') ||
    e.message.includes('Module not found') ||
    e.message.includes('Cannot compile')
  );
  if (buildErrors.length > 0) {
    blockers.push({
      type: 'build-failure',
      severity: 'critical',
      description: 'Cannot build project',
      errors: buildErrors
    });
  }
  
  // Unsaved files
  const unsaved = files.filter(f => f.isDirty);
  if (unsaved.length > 0) {
    blockers.push({
      type: 'unsaved-files',
      severity: 'high',
      description: `${unsaved.length} files have unsaved changes`,
      files: unsaved.map(f => f.name)
    });
  }
  
  return blockers;
};
```

## Usage in Session Summary

```javascript
// Example usage in summary generation
const analyzeSession = (sessionData) => {
  // Detect session type
  const sessionType = 
    isBugFix(sessionData.commands, sessionData.files) ? 'bug-fix' :
    isFeatureDev(sessionData.files, sessionData.commands) ? 'feature-dev' :
    isRefactoring(sessionData.commands, sessionData.terminalHistory) ? 'refactoring' :
    isExploration(sessionData.files, sessionData.commands) ? 'exploration' :
    'general';
  
  // Extract patterns
  const errors = detectErrorPatterns(sessionData.terminalHistory);
  const successes = detectSuccessPatterns(sessionData.terminalHistory);
  const decisions = detectArchitectureDecisions(sessionData.files, sessionData.commands);
  const debt = detectTechnicalDebt(sessionData.files);
  const blockers = detectBlockers(sessionData.errors, sessionData.files);
  
  return {
    sessionType,
    errors,
    successes,
    keyDecisions: decisions,
    technicalDebt: debt,
    blockers
  };
};
```

## Pattern Confidence Scoring

```javascript
const calculateConfidence = (patterns) => {
  // More indicators = higher confidence
  const weights = {
    commands: 0.4,
    files: 0.3,
    terminal: 0.2,
    errors: 0.1
  };
  
  let score = 0;
  if (patterns.commandMatch) score += weights.commands;
  if (patterns.fileMatch) score += weights.files;
  if (patterns.terminalMatch) score += weights.terminal;
  if (patterns.errorMatch) score += weights.errors;
  
  return score; // 0.0 to 1.0
};
```

Use confidence to determine:
- High (>0.7): Definitive session type
- Medium (0.4-0.7): Likely session type
- Low (<0.4): General/mixed session
