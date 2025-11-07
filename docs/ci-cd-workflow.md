# CI/CD Workflow

This document describes the automated build and publish process for the QPub SDK.

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

### Step-by-Step Process

1. **Update the version** in `package.json`:
   ```bash
   # For patch releases (bug fixes)
   npm version patch
   
   # For minor releases (new features, backward compatible)
   npm version minor
   
   # For major releases (breaking changes)
   npm version major
   ```

2. **Push the changes and tag**:
   ```bash
   git push origin dev
   git push origin --tags
   ```

3. **GitHub Actions will automatically**:
   - Run all tests
   - Build the packages
   - Publish to npm
   - Create a GitHub release

4. **Monitor the workflow**:
   - Go to the [Actions tab](https://github.com/qpubio/qpub-js/actions)
   - Watch the "Publish to npm" workflow

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

