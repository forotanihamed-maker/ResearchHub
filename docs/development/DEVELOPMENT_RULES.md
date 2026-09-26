# ResearchHub — Development Rules

## 1. Source of Truth

Code describes the current implementation. Product documents describe intended behavior. `CURRENT_STATE.md` records gaps.

## 2. Authorization

Never rely on UI hiding alone. Sensitive actions must be checked server-side.

## 3. Validation

Reuse `src/lib/validation.ts` for shared validation rules.

## 4. Database Changes

Schema changes require a migration and documentation update.

## 5. Feature Workflow

For a new feature:

1. define product requirement
2. define permissions
3. define data model
4. define API contract
5. implement
6. test
7. update documentation

## 6. Documentation Freeze

Until the current documentation set is stabilized, do not add product features unless required to fix a correctness/security issue.
