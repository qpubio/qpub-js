# Contributing to QPub JavaScript SDK

Thank you for your interest in contributing to the QPub JavaScript SDK! This document provides guidelines and instructions for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git

### Setup Your Development Environment

1. **Fork and clone the repository:**
   ```bash
   git clone git@github.com:YOUR_USERNAME/qpub-js.git
   cd qpub-js
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify setup by running tests:**
   ```bash
   npm test
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## Development Workflow

### Branch Strategy

We use a Git Flow approach:

- **`main`** - Production-ready code, tagged releases
- **`dev`** - Active development branch
- **`feature/*`** - Feature branches (branch from `dev`)
- **`fix/*`** - Bug fix branches (branch from `dev`)

### Working on a Feature or Fix

1. **Create a feature branch from dev:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [code standards](#code-standards)

3. **Write or update tests** for your changes

4. **Run tests locally:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Adding or updating tests
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements
   - `chore:` - Maintenance tasks

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request:**
   - Go to GitHub and create a PR from your branch to `dev`
   - Fill in the PR template with details
   - Link any related issues

## Code Standards

### TypeScript Guidelines

- Use TypeScript for all code
- Enable strict type checking
- Avoid `any` types - use proper typing
- Document complex types and interfaces
- Export public APIs with clear type definitions

### Code Style

We use Prettier for code formatting:

```bash
npm run lint:fix
```

**Key conventions:**
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Use async/await over promises chains
- Handle errors appropriately

### File Organization

```
src/
├── core/              # Core SDK functionality
├── react-integration/ # React-specific code
├── types/            # TypeScript type definitions
└── testing/          # Testing utilities
```

## Testing

### Writing Tests

- Place tests in `__tests__/` directory
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies
- Aim for meaningful coverage, not just high percentages

### Test Structure

```typescript
describe("Component/Feature", () => {
    describe("Specific Functionality", () => {
        it("should do something specific", () => {
            // Arrange
            const input = setupTestData();
            
            // Act
            const result = performAction(input);
            
            // Assert
            expect(result).toBe(expected);
        });
    });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run CI tests (like GitHub Actions)
npm run test:ci
```

### Coverage Requirements

Minimum coverage thresholds:
- Statements: 50%
- Branches: 45%
- Functions: 45%
- Lines: 52%

We encourage increasing coverage when adding new features.

## Submitting Changes

### Pull Request Guidelines

1. **Target the correct branch:**
   - Features/fixes → `dev` branch
   - Hotfixes → `main` branch (rare, only for urgent production fixes)

2. **PR Title:** Use Conventional Commits format
   ```
   feat: add WebSocket reconnection logic
   fix: resolve memory leak in channel manager
   docs: update authentication examples
   ```

3. **PR Description should include:**
   - What changes were made and why
   - How to test the changes
   - Any breaking changes
   - Related issue numbers

4. **Before submitting:**
   - ✅ All tests pass locally
   - ✅ Code is formatted (`npm run lint:fix`)
   - ✅ No linting errors (`npm run lint`)
   - ✅ Build succeeds (`npm run build`)
   - ✅ Documentation updated if needed

5. **Review Process:**
   - Wait for CI checks to pass
   - Address review feedback
   - Keep PR focused and reasonably sized
   - Be responsive to maintainer questions

## Release Process

**Note:** Only maintainers can publish releases. Contributors don't need to worry about this.

### For Maintainers: Publishing a New Version

Follow this workflow to publish a new release:

```bash
# 1. Ensure dev branch is ready
git checkout dev
git pull origin dev
# Verify CI passes on GitHub Actions

# 2. Create Pull Request: dev → main
# - Go to GitHub UI
# - Create PR from dev to main
# - Review and merge

# 3. Create version tag on main
git checkout main
git pull origin main
npm version patch  # or minor/major

# 4. Push to trigger automated publish
git push origin main
git push origin --tags

# 5. Sync main back to dev
git checkout dev
git merge main
git push origin dev
```

**Versioning:**
- **Patch** (2.0.2 → 2.0.3): Bug fixes, minor changes
- **Minor** (2.0.3 → 2.1.0): New features, backward compatible
- **Major** (2.1.0 → 3.0.0): Breaking changes

**What happens automatically:**
- GitHub Actions runs tests and builds
- Package published to npm with provenance
- GitHub Release created
- npm package available at `@qpub/sdk@version`

See [CI/CD Workflow Documentation](docs/ci-cd-workflow.md) for complete details.

## Project Structure

```
qpub-js/
├── src/                      # Source code
│   ├── core/                # Core SDK (Socket, Rest, Channels)
│   ├── react-integration/   # React hooks and components
│   ├── types/               # TypeScript definitions
│   └── testing/             # Testing utilities
├── __tests__/               # Test files
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── docs/                    # Documentation
├── .github/                 # GitHub Actions workflows
├── build/                   # Build output (not committed)
└── node_modules/           # Dependencies (not committed)
```

## Additional Resources

- [CI/CD Workflow](docs/ci-cd-workflow.md) - Build and deployment process
- [Token Authentication](docs/token-authentication.md) - Authentication methods
- [Testing Best Practices](docs/testing-best-practices.md) - Testing guidelines
- [React Integration](src/react-integration/README.md) - React usage guide
- [QPub Documentation](https://qpub.io/docs) - Main documentation

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/qpubio/qpub-js/issues)
- **Discussions:** [GitHub Discussions](https://github.com/qpubio/qpub-js/discussions)
- **Documentation:** [qpub.io/docs](https://qpub.io/docs)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to QPub! 🎉

