# GitHub Actions Setup Guide

This guide will help you complete the CI/CD setup for the QPub SDK.

## Required: NPM Token Configuration

To enable automated publishing to npm, you need to add your npm token as a GitHub secret.

### Step 1: Generate npm Token

1. Go to [npmjs.com](https://www.npmjs.com/) and log in
2. Click on your profile → "Access Tokens"
3. Click "Generate New Token" → Select "Automation"
4. Give it a descriptive name like "GitHub Actions - qpub-js"
5. Copy the token (you won't be able to see it again!)

### Step 2: Add Token to GitHub

1. Go to your repository: https://github.com/qpubio/qpub-js
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste the token you copied
6. Click **"Add secret"**

## Optional: Codecov Integration

For code coverage reports on PRs (optional):

1. Go to [codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add it as a GitHub secret named `CODECOV_TOKEN` (same process as above)

## Verify Setup

After adding the npm token:

1. Make a small change to trigger CI
2. Push to the `dev` branch
3. Go to the **Actions** tab in GitHub
4. Verify the "CI" workflow runs successfully

## Test Publishing (Optional)

To test the publish workflow without actually publishing:

1. Create a test branch
2. Update version in package.json to something like `2.0.3-test.1`
3. Create a tag: `git tag v2.0.3-test.1 && git push origin v2.0.3-test.1`
4. Watch the workflow run (it will fail at publish if you don't want test versions published)

## Next Steps

Once the npm token is configured, you're ready to:

1. Commit the CI/CD changes
2. Push to the dev branch
3. When ready for a release, use `npm version patch/minor/major`
4. Push the tag, and GitHub Actions will handle the rest!

## Troubleshooting

- **Workflow not running**: Check that the workflow files are in `.github/workflows/`
- **Publish fails**: Verify `NPM_TOKEN` secret is set correctly
- **Permission denied**: Ensure the npm token has publish permissions

## Documentation

- Full CI/CD documentation: [docs/ci-cd-workflow.md](../docs/ci-cd-workflow.md)
- React integration: [src/react-integration/README.md](../src/react-integration/README.md)
- Main README: [README.md](../README.md)

