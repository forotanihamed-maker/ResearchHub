PLAYBOOK: PROJECT_PROBLEM

Use this playbook for:
- project not visible
- project creation failure
- project editing failure
- project deletion problems
- project ownership problems
- project visibility problems
- project member problems

First identify:

1. User role
2. Project ID
3. Exact action
4. Expected behavior
5. Actual behavior

Check in this order:

1. Does the project exist?
2. Is the project public or private?
3. Is the user authorized?
4. Is the user a project member?
5. Is ownership correct?
6. Is creatorId correct?
7. Is creatorRole correct?
8. Does the API return the expected project?
9. Does the frontend correctly display the API result?

Relevant APIs may include:

/api/projects
/api/projects/[id]
/api/projects/[id]/applications
/api/projects/[id]/members/[userId]

Do not modify database records during diagnosis.
Prefer read-only inspection.
