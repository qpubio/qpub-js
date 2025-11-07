# CI/CD Workflow

This document describes the automated build and publish process for the QPub SDK.

## Quick Reference

**Publishing a new version (recommended):**

```bash
# 1. Push to dev and verify CI passes
git checkout dev && git push origin dev

# 2. Create PR: dev → main on GitHub, then merge

# 3. Release from main
git checkout main && git pull origin main
npm version patch  # or minor/major
git push origin main && git push origin --tags

# 4. Sync back to dev
git checkout dev && git merge main && git push origin dev
```

**Result:** Automatic build → test → npm publish → GitHub release 🚀

---

## Overview

The SDK uses GitHub Actions for continuous integration and deployment. Build artifacts are **not** committed to the repository; instead, they are generated during the CI/CD pipeline and published to npm.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `dev` branches
- Pull requests to `main` or `dev` branches

**What it does:**
- Tests on multiple Node.js versions (18.x, 20.x, 22.x)
- Runs type checking (`npm run lint`)
- Builds the packages
- Runs the full test suite with coverage
- Verifies all expected build artifacts are created
- Uploads coverage to Codecov (optional)
- Stores build artifacts for inspection

**Duration:** ~3-5 minutes

### 2. Publish Workflow (`.github/workflows/publish.yml`)

**Triggers:**
- Pushing a version tag (e.g., `v2.0.3`, `v3.1.0`)

**What it does:**
1. Runs all tests and type checking
2. Builds the packages
3. Verifies package.json version matches the git tag
4. Publishes to npm with provenance
5. Creates a GitHub Release

**Duration:** ~2-3 minutes

## Publishing a New Version

### Recommended Workflow: Release from `main` Branch

This is the professional standard for production releases with proper review and branch management.

#### Step-by-Step Process

1. **Ensure dev branch is ready and CI passes**:
   ```bash
   git checkout dev
   git push origin dev
   ```
   - Go to [Actions tab](https://github.com/qpubio/qpub-js/actions) and verify CI passes
   - All tests must pass before proceeding

2. **Create Pull Request from dev to main**:
   - Go to GitHub repository
   - Click "Pull requests" → "New pull request"
   - Set base: `main` ← compare: `dev`
   - Review changes, add description
   - Create and merge the PR (after review/approval if needed)

3. **Switch to main and pull merged changes**:
   ```bash
   git checkout main
   git pull origin main
   ```

4. **Create version tag** (automatically creates a commit):
   ```bash
   # For patch releases (bug fixes: 2.0.2 → 2.0.3)
   npm version patch
   
   # For minor releases (new features: 2.0.3 → 2.1.0)
   npm version minor
   
   # For major releases (breaking changes: 2.1.0 → 3.0.0)
   npm version major
   ```
   - This updates `package.json`, creates a commit, and creates a git tag

5. **Push version commit and tag to main**:
   ```bash
   git push origin main
   git push origin --tags
   ```
   - **This triggers the publish workflow!**

6. **Sync main back to dev** (keep branches in sync):
   ```bash
   git checkout dev
   git merge main
   git push origin dev
   ```

7. **Monitor the publish workflow**:
   - Go to [Actions tab](https://github.com/qpubio/qpub-js/actions)
   - Watch the "Publish to npm" workflow
   - Verify it completes successfully

### Alternative: Quick Release from `dev` Branch

For faster iteration without PR overhead (use with caution):

```bash
git checkout dev
npm version patch
git push origin dev
git push origin --tags
```

**Note:** While this works, releasing from `main` is the recommended approach for production SDKs.

### What GitHub Actions Does Automatically

When you push a version tag, the publish workflow:
- ✅ Runs all tests
- ✅ Runs type checking
- ✅ Builds the packages
- ✅ Verifies version matches tag
- ✅ Publishes to npm with provenance
- ✅ Creates a GitHub release

### Manual Testing Before Release

Before creating a release tag, you can test the build locally:

```bash
# Install dependencies
npm ci

# Run type checking
npm run lint

# Run tests
npm run test:ci

# Build the packages
npm run build

# Verify the build artifacts
ls -lh build/
```

## NPM Token Setup (One-Time)

To enable automated publishing, you need to configure an npm token as a GitHub secret:

1. **Generate an npm token**:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Navigate to Settings → Access Tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. **Add token to GitHub**:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## Local Development

### Building Locally

The build artifacts are ignored by git, but you can still build locally for testing:

```bash
npm run build
```

This is useful for:
- Testing the build process before pushing
- Debugging build issues
- Local integration testing

### prepublishOnly Hook

The `prepublishOnly` script ensures that:
- Type checking passes
- All tests pass
- Build is fresh

This provides a safety net if you accidentally run `npm publish` locally (though we recommend always using the CI/CD workflow).

## Benefits of This Approach

### 1. **Reproducible Builds**
- Same environment every time (Ubuntu, Node 20.x)
- Eliminates "works on my machine" issues
- Consistent dependency resolution with `npm ci`

### 2. **Clean Git History**
- No build artifact commits cluttering history
- Smaller repository size
- No merge conflicts in generated files
- Easier code reviews (only source changes)

### 3. **Security & Trust**
- npm provenance provides transparency
- All releases go through CI (tests + builds)
- No manual build/publish mistakes
- Audit trail of every release

### 4. **Automation**
- Reduces human error
- Consistent release process
- Saves time for developers
- Enforces quality gates (tests, linting)

## Troubleshooting

### Build Fails on CI but Works Locally

**Common causes:**
- Different Node.js versions
- Missing dependencies (use `npm ci` instead of `npm install`)
- Environment-specific code
- Uncommitted files

**Solution:**
```bash
# Test with the exact CI setup
rm -rf node_modules package-lock.json
npm install
npm ci
npm run build
```

### Tag Already Exists Error

If you need to republish a version:

```bash
# Delete the tag locally and remotely
git tag -d v2.0.3
git push origin :refs/tags/v2.0.3

# Create new tag
npm version patch
git push origin --tags
```

### Publish Workflow Fails

1. Check the workflow logs in GitHub Actions
2. Common issues:
   - Missing or expired `NPM_TOKEN` secret
   - Version mismatch between tag and package.json
   - Failed tests
   - npm registry issues

### GitHub Release Creation Fails

**Error:** `Resource not accessible by integration`

**Cause:** Insufficient permissions for creating releases

**Solution:** The workflow needs `contents: write` permission. This should already be configured in `.github/workflows/publish.yml`:

```yaml
permissions:
  contents: write  # Required for creating releases
  id-token: write  # Required for npm provenance
```

If this error occurs, verify the permissions section in the publish workflow file.

### Build Artifacts Missing Locally

This is expected! Build artifacts are not committed to git. To regenerate them:

```bash
npm run build
```

## Workflow Files

### CI Workflow Features

- **Matrix testing**: Tests on Node 18, 20, and 22
- **Bundle verification**: Ensures all expected files are created
- **Size reporting**: Shows bundle sizes in logs
- **Artifact upload**: Stores builds for 7 days for inspection

### Publish Workflow Features

- **Version validation**: Ensures package.json matches git tag
- **npm provenance**: Cryptographic proof of package origin
- **Automatic releases**: Creates GitHub releases with changelog
- **Test before publish**: Runs full test suite before deploying

## Best Practices

### For Contributors

1. Never commit build artifacts
2. Let CI handle all builds
3. Review CI logs if your PR fails
4. Run `npm run lint` and `npm test` before pushing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for complete contribution guidelines.

### For Maintainers

1. Always use `npm version` for version bumps
2. Never manually edit version numbers
3. Review CI results before merging PRs
4. Monitor npm publish workflows
5. Keep npm token secure and rotate periodically

## Future Enhancements

Potential improvements to consider:

- Add bundle size checks (fail if bundles grow too large)
- Semantic release automation
- Automated changelog generation
- Preview deployments for PRs
- Performance benchmarking in CI
- Visual regression testing

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Semantic Versioning](https://semver.org/)

