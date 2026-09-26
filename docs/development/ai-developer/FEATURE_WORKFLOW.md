# ResearchHub — Feature Development Workflow

## 1. Request
```text
Feature:
User goal:
Who uses it:
Expected behavior:
```

## 2. Investigate
Inspect actual code:
```text
Pages/UI:
Components:
API:
Database:
Authentication:
Authorization:
Existing related functionality:
Consumers:
```

## 3. Impact
```text
Database:
API:
UI:
Authorization:
Security:
Concurrency:
Compatibility:
Performance:
Risk:
```

## 4. Plan
List files to change/add/remove, DB/API/UI changes and verification steps.
Get explicit approval before risky/destructive/production changes.

## 5. Implement
Minimum necessary change. Preserve architecture/security. No unrelated refactor.

## 6. Verify
Run applicable typecheck/lint/build/tests and affected flows.

## 7. Review
Check correctness, regressions, security, authorization, data integrity, race conditions, complexity and unnecessary changes.

## 8. Final report
```text
FEATURE:
STATUS:
FILES CHANGED:
IMPLEMENTATION:
DATABASE:
API:
SECURITY/AUTHORIZATION:
TESTS:
RESULT:
REMAINING:
```

If a second AI is available, use it primarily as a code reviewer. Give it the feature, plan, diff/changed files and relevant reference docs. Ask it to find bugs, security/authorization issues, data-integrity/race conditions and regressions. It should not silently redesign the feature.
