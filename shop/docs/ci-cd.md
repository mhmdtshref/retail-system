# CI/CD with GitHub Actions and Vercel

This project uses GitHub Actions for CI and Vercel for deployments.

## Environments
- preview: PR builds, ephemeral. Secrets via GitHub env `preview` and Vercel Preview env.
- staging: optional, pre-prod.
- production: gated by approval in GitHub Environment `production`.

## Secrets
Store in GitHub Environments and Vercel project settings (never commit):
- VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID (GH env)
- App envs in Vercel: MONGODB_URI_*, NEXTAUTH_SECRET, etc.

## Flow
1. Open PR → CI runs lint, typecheck, build, smoke, budgets, audit.
2. Vercel Preview workflow posts a Preview URL as sticky comment.
3. Merge to main → production workflow builds and deploys with environment approval.

## Forks
Preview deploys from forks are disabled to avoid secret exposure.
