# Testing Guide for Coder1 IDE

This guide explains how to use the comprehensive testing infrastructure for the Coder1 IDE project.

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test types
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
```

## 📋 Available Test Commands

### Core Testing
- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode (development)
- `npm run test:coverage` - Generate coverage reports
- `npm run test:ci` - CI-optimized test run
- `npm run test:debug` - Debug mode with detailed output

### Test Categories
- `npm run test:unit` - Components, services, utilities
- `npm run test:integration` - API endpoints, database operations
- `npm run test:e2e` - Full user workflows

### Quality Assurance
- `npm run test:performance` - Lighthouse performance audit
- `npm run test:bundle-size` - Check bundle size limits
- `npm run lint` - Code style checking
- `npm run type-check` - TypeScript validation

## 🏗️ Test Structure

```
tests/
├── components/           # Component unit tests
│   ├── StatusBar.test.tsx
│   ├── Terminal.test.tsx
│   └── SessionsPanel.test.tsx
├── integration/          # Integration tests
├── e2e/                 # End-to-end tests
│   └── prd-genius-e2e.test.ts
├── utils/               # Test utilities
│   └── test-helpers.ts
├── setup.ts             # Global test setup
├── global-setup.ts      # Pre-test environment setup
└── global-teardown.ts   # Post-test cleanup
```

## 🔧 Writing Tests

### Component Testing

```typescript
import { renderWithProviders, mockSession } from '@/tests/utils/test-helpers';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProviders(<MyComponent />);
    expect(getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const mockCallback = jest.fn();
    const { getByRole } = renderWithProviders(
      <MyComponent onAction={mockCallback} />
    );
    
    await userEvent.click(getByRole('button'));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

### API Testing

```typescript
import { mockFetchResponse } from '@/tests/utils/test-helpers';

describe('API Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should fetch session data', async () => {
    const mockData = { sessions: [mockSession()] };
    fetch.mockResolvedValue(mockFetchResponse(mockData));

    const result = await fetchSessions();
    expect(result).toEqual(mockData);
  });
});
```

### Performance Testing

```typescript
import { measureRenderTime, detectMemoryLeak } from '@/tests/utils/test-helpers';

describe('Performance Tests', () => {
  it('should render within performance budget', async () => {
    const renderTime = await measureRenderTime(() => {
      renderWithProviders(<ExpensiveComponent />);
    });
    
    expect(renderTime).toBeLessThan(100); // 100ms budget
  });

  it('should not have memory leaks', async () => {
    const leak = await detectMemoryLeak(async () => {
      const { unmount } = renderWithProviders(<ComponentWithCleanup />);
      unmount();
    });
    
    expect(leak.isLeak).toBe(false);
  });
});
```

## 📊 Coverage Requirements

### Global Thresholds
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Critical Components (Higher Standards)
- **StatusBar**: 85% coverage
- **Terminal**: 80% coverage
- **SessionsPanel**: 80% coverage

## 🔄 Continuous Integration

### GitHub Actions Pipeline

The CI pipeline runs automatically on:
- Push to `main`, `master`, or `develop` branches
- Pull requests to these branches

#### Pipeline Stages
1. **Quality Checks** (10 min)
   - ESLint code style
   - TypeScript compilation
   - Security vulnerability scan

2. **Testing** (15 min)
   - Unit tests with coverage
   - Integration tests
   - E2E tests

3. **Performance Analysis** (15 min)
   - Lighthouse audit
   - Bundle size verification
   - Performance regression detection

4. **Build Verification** (10 min)
   - Multi-platform builds (Ubuntu, macOS)
   - Multi-version testing (Node 18, 20)
   - Production build validation

### Quality Gates

All stages must pass for deployment readiness:
- ✅ Code quality checks
- ✅ Test coverage thresholds met
- ✅ Performance benchmarks passed
- ✅ Security scan clean
- ✅ Build successful across platforms

## 🎯 Performance Budgets

### Bundle Size Limits
- Main JS bundle: **400 kB** (gzipped)
- CSS bundle: **100 kB** (gzipped)
- Orchestrator loader: **15 kB** (gzipped)
- PRD Genius optimized: **20 kB** (gzipped)
- Individual modules: **30 kB** (gzipped)

### Runtime Performance
- First Contentful Paint: **< 2 seconds**
- Largest Contentful Paint: **< 4 seconds**
- Cumulative Layout Shift: **< 0.1**
- Total Blocking Time: **< 500ms**
- Time to Interactive: **< 5 seconds**

## 🛠️ Development Workflow

### Pre-commit Hooks

Automatic checks run before each commit:
1. Code style validation (ESLint)
2. Type checking (TypeScript)
3. Unit tests for changed files
4. Bundle size impact analysis

### Watch Mode Development

```bash
# Start development with test watching
npm run test:watch

# Run specific test file
npm test -- StatusBar.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="session"
```

### Debugging Tests

```bash
# Debug mode with detailed output
npm run test:debug

# Debug specific test
npm run test:debug -- StatusBar.test.tsx

# Debug with Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🔍 Troubleshooting

### Common Issues

#### Tests Failing Locally But Passing in CI
- Clear Jest cache: `jest --clearCache`
- Check Node.js version matches CI
- Verify environment variables

#### Memory Issues During Testing
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Check for memory leaks with: `npm run test:debug`

#### Slow Test Performance
- Use `jest --runInBand` for sequential execution
- Profile tests with `jest --detectOpenHandles`
- Consider splitting large test files

### Performance Debugging

```bash
# Profile bundle size
npm run build && npm run test:bundle-size

# Run Lighthouse locally
npm run test:performance

# Memory profiling
npm run test:memory
```

## 📈 Metrics and Reporting

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Summary**: `coverage/coverage-summary.json`
- **LCOV**: `coverage/lcov.info`

### Performance Reports
- **Lighthouse**: `.lighthouseci/`
- **Bundle Analysis**: Console output
- **Test Results**: `junit.xml`

### Accessing Reports

```bash
# Open coverage report
open coverage/lcov-report/index.html

# View test summary
cat coverage/coverage-summary.json

# Check bundle size trends
npm run test:bundle-size
```

## 🚦 Status Indicators

The testing pipeline provides real-time feedback:

- 🟢 **Green**: All tests passing, coverage met
- 🟡 **Yellow**: Tests passing, coverage below threshold
- 🔴 **Red**: Tests failing or critical issues
- 🟦 **Blue**: Tests running or pending

## 🎓 Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### Mock Strategy
- Mock external dependencies (APIs, storage)
- Use real implementations for internal modules
- Reset mocks between tests

### Performance Testing
- Test critical user journeys
- Monitor bundle size growth
- Set realistic performance budgets

### Maintenance
- Keep tests updated with code changes
- Remove or update obsolete tests
- Monitor and fix flaky tests

---

**Happy Testing! 🧪**

For questions or issues, please refer to the [main documentation](./README.md) or create an issue in the repository.