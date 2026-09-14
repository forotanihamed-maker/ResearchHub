PLAYBOOK: VERCEL_PROBLEM

Use for:
- deployment failure
- build failure
- runtime error
- API 500
- environment variable issue
- production outage
- unexpected production behavior

First determine:

1. Is the deployment successful?
2. Is the problem during build or runtime?
3. Is the problem frontend or API?
4. Does the problem happen locally?
5. Does the problem happen only in production?

If build fails:
Request the relevant build error.

If deployment succeeds but API returns 500:
Request relevant runtime log.

If environment variable is suspected:
Ask for the variable NAME only.
Never ask for its VALUE.

Check:

- DATABASE_URL exists
- JWT_SECRET exists
- required environment variables exist
- production/development environment distinction

Never ask user to paste secrets.

For production incidents:
1. Determine severity.
2. Check latest deployment.
3. Check runtime logs.
4. Compare with previous working deployment.
5. Consider rollback if appropriate.
6. Verify service after rollback.

Do not recommend deleting production resources as a first response.
