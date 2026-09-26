# Release Checklist

## Before Release

- [ ] `npm ci` succeeds
- [ ] `npm run typecheck` succeeds
- [ ] `npm run build` succeeds
- [ ] critical API flows tested
- [ ] authorization tested
- [ ] private project access tested
- [ ] file upload/access tested
- [ ] migrations reviewed
- [ ] documentation updated
- [ ] no secrets committed

## Before Pilot

- [ ] production DB isolated
- [ ] backup/snapshot available
- [ ] seed endpoint disabled or protected
- [ ] demo accounts secured/removed
- [ ] BLOB token verified
- [ ] health endpoint verified
- [ ] pilot scope documented
- [ ] support owner defined
