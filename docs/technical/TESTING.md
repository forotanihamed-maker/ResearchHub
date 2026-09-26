# ResearchHub — Testing & Verification

## Current Verification Status

The source archive was inspected on 2026-09-26.

`npm run typecheck` could not be completed successfully in the inspection environment because dependencies were not installed/available in `node_modules`; therefore the reported TypeScript errors cannot be treated as confirmed source-code defects.

## Minimum Pre-Pilot Tests

### Authentication
- register student
- register professor
- professor pending/approval flow
- login/logout
- password change

### Projects
- professor creates project
- student creates project
- public/private visibility
- project discovery
- project details
- capacity enforcement
- deadline behavior

### Membership
- student application
- approve/reject
- owner invite
- private invite
- member removal
- duplicate membership prevention

### Execution
- task creation
- task assignment
- task status change
- task deletion
- milestone creation/update/delete
- activity history

### Files
- document upload
- chat attachment
- deliverable upload after completion
- file deletion
- unauthorized file access

### Admin
- department scope
- faculty overview
- professor management
- admin messaging
- project visibility rules

### Security
- IDOR/BOLA tests
- role escalation tests
- CSRF tests
- rate-limit behavior
- private project access
- private file access

## Acceptance Principle

A feature is not considered Pilot-ready merely because its UI exists. Its API authorization, persistence, error handling and security behavior must also be verified.
