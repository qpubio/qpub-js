# GitHub Actions Setup Guide

This guide will help you complete the CI/CD setup for the QPub SDK.

## Required: npm Trusted Publishing

Publishing uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) via GitHub OIDC — no `NPM_TOKEN` secret is needed.

1. Log in at [npmjs.com](https://www.npmjs.com/) as a maintainer of `@qpub/sdk`
2. Open the package → **Settings** → **Trusted Publisher**
3. Add a **GitHub Actions** trusted publisher for this repository (`qpubio/qpub-js`, workflow `publish.yml`, environment optional)

## Optional: Codecov Integration

For code coverage reports on PRs (optional):

1. Go to [codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add it as a GitHub secret named `CODECOV_TOKEN` (Settings → Secrets and variables → Actions)

## Verify Setup

1. Make a small change to trigger CI
2. Push to the `dev` branch
3. Go to the **Actions** tab in GitHub
4. Verify the "CI" workflow runs successfully

## Publishing a release

1. Bump `version` in `package.json` (must match the tag, without the `v` prefix)
2. Commit and push
3. Create and push a version tag:

```bash
git tag v2.0.10
git push origin v2.0.10
```

4. The **Publish to npm** workflow runs automatically: test → lint → build → publish → GitHub release

## Troubleshooting

- **Workflow not running**: Check that the workflow files are in `.github/workflows/`
- **Publish fails**: Verify the npm Trusted Publisher is configured for `qpubio/qpub-js` and workflow `publish.yml`
- **Version mismatch**: Ensure `package.json` version matches the tag without the `v` prefix

## Documentation

- Full CI/CD documentation: [docs/ci-cd-workflow.md](../docs/ci-cd-workflow.md)
- React integration: [src/react-integration/README.md](../src/react-integration/README.md)
- Main README: [README.md](../README.md)
