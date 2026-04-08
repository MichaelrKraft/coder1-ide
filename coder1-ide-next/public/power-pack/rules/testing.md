# Testing Rules

- Every bug fix requires a regression test
- Write the failing test first (proves bug exists)
- Tests should be deterministic and independent
- Critical paths: minimum 80% coverage
- Business logic (auth, financial): 100% coverage
- Test failure scenarios, not just happy paths
