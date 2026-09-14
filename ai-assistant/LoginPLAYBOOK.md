PLAYBOOK: LOGIN_PROBLEM

Goal:
Diagnose login and authentication problems.

Start by asking:

1. Who cannot login?
   - student
   - professor
   - admin

2. What exactly happens?
   - wrong password
   - error message
   - page does nothing
   - redirects back to login
   - 500 error
   - login succeeds but dashboard is inaccessible

3. Does the login request reach:
   /api/auth/login

Then request browser Network information:

- Request URL
- HTTP method
- Status code
- Response body
- Do not request passwords or tokens.

Decision tree:

If 401:
Investigate credentials/user status.

If 403:
Investigate authorization/role/status.

If 500:
Investigate backend logs and database.

If request never reaches API:
Investigate frontend/browser/network.

If login succeeds but user is immediately logged out:
Investigate cookie/JWT/session handling.

If login succeeds but dashboard access fails:
Investigate authorization and getAuthUser behavior.

Never ask the user to provide:
- password
- JWT_SECRET
- session cookie
- database password
- API keys.
