# SageMaker Code Editor - Development Guide

This guide explains how to develop and test SageMaker Code Editor locally using the separated CI/CD pipeline.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (for act testing)
- Git with submodules

### Local Development
```bash
# Test your changes locally
./scripts/test-local.sh

# Clean cache when needed
./scripts/clean-cache.sh
```

### CI/CD Testing
```bash
# Test unit tests locally
~/bin/act -W .github/workflows/ci.yml

# Test build (may hit memory limits locally)
~/bin/act -W .github/workflows/build.yml --container-options="--memory=8g"
```

## 📋 Development Workflow

### 1. Make Changes
Edit your code, patches, or configuration files.

### 2. Test Locally
```bash
./scripts/test-local.sh
```
- **First run**: 15-20 minutes (full build)
- **Subsequent runs**: ~30 seconds (cached)
- **Server**: http://localhost:8080

### 3. Validate with CI Tests
```bash
# Fast unit tests (30 seconds)
~/bin/act -W .github/workflows/ci.yml
```

### 4. Push to GitHub
```bash
git add .
git commit -m "Your changes"
git push origin your-branch
```

## 🛠️ Tools Reference

### test-local.sh
**Purpose**: Build and run SageMaker Code Editor locally with smart caching.

**Usage**:
```bash
./scripts/test-local.sh
```

**What it does**:
1. Installs dependencies (cached)
2. Applies patches
3. Builds VS Code (cached by git revision + patches)
4. Starts server on http://localhost:8080

**Caching**:
- Dependencies cached by `package.json` changes
- VS Code builds cached by git revision + patch changes
- Cache stored in `.local-cache/` directory

**First run**: 15-20 minutes
**Cached runs**: ~30 seconds

### clean-cache.sh
**Purpose**: Clean all local caches and build artifacts.

**Usage**:
```bash
./scripts/clean-cache.sh
```

**What it removes**:
- `.local-cache/` directory
- `node_modules/` directories
- `vscode-reh-web-linux-x64/` build output

**When to use**:
- Build issues or corruption
- Major dependency changes
- Disk space cleanup

### act (GitHub Actions locally)
**Purpose**: Test GitHub Actions workflows locally using Docker.

**Installation**:
```bash
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash -s -- -b ~/bin
```

**Usage**:
```bash
# Test CI workflow (recommended)
~/bin/act -W .github/workflows/ci.yml

# Test specific job
~/bin/act -j run-unit-tests -W .github/workflows/ci.yml

# Test build workflow (memory intensive)
~/bin/act -W .github/workflows/build.yml --container-options="--memory=8g"

# List available workflows
~/bin/act --list
```

**Limitations**:
- Build workflow may hit Docker memory limits locally
- Use for CI validation, not full builds
- GitHub Actions runners have more resources

## 📁 Project Structure

```
sagemaker-code-editor/
├── .github/workflows/
│   ├── ci.yml           # Unit tests & validation
│   ├── build.yml        # VS Code build with caching
│   └── e2e.yml          # Integration tests
├── scripts/
│   ├── test-local.sh    # Local development script
│   └── clean-cache.sh   # Cache cleanup script
├── patches/             # VS Code patches
├── vscode/              # VS Code submodule
└── .local-cache/        # Local build cache (gitignored)
```

## 🔄 CI/CD Pipeline

### ci.yml - Unit Tests
- **Triggers**: Every push/PR
- **Duration**: ~30 seconds
- **Purpose**: Fast feedback on code quality
- **Tests**: CSP validation, linting, security audit

### build.yml - Build Process
- **Triggers**: Every push/PR
- **Duration**: 30-40 minutes
- **Purpose**: Create deployable artifacts
- **Features**: Smart caching, Node 22, memory optimization

### e2e.yml - Integration Tests
- **Triggers**: After successful builds
- **Duration**: Variable
- **Purpose**: End-to-end validation
- **Dependencies**: Requires build artifacts

## 🐛 Troubleshooting

### Local Build Issues
```bash
# Clean everything and rebuild
./scripts/clean-cache.sh
./scripts/test-local.sh
```

### Memory Issues with act
```bash
# Increase Docker memory
~/bin/act -W .github/workflows/build.yml --container-options="--memory=8g --memory-swap=8g"

# Or skip memory-intensive steps
~/bin/act -W .github/workflows/build.yml --skip-steps="Build vscode"
```

### Patch Application Failures
```bash
# Check patch status
cd vscode && quilt series -v

# Reset patches
quilt pop -a
quilt push -a
```

### Cache Issues
```bash
# Check cache contents
ls -la .local-cache/

# Selective cleanup
rm -rf .local-cache/vscode-*
```

## 💡 Tips

### Performance
- Use cached builds for development (30 seconds vs 20 minutes)
- Only clean cache when necessary
- Test CI locally before pushing

### Memory Management
- Local builds use 6GB heap limit
- GitHub Actions use 8GB heap limit
- Docker containers may need memory limits increased

### Development Speed
1. **Fastest**: `~/bin/act -W .github/workflows/ci.yml` (30 seconds)
2. **Medium**: `./scripts/test-local.sh` (30 seconds cached, 20 minutes first time)
3. **Slowest**: Push to GitHub (30-40 minutes full pipeline)

### Best Practices
- Test CI locally before pushing
- Use local development for iterative changes
- Clean cache only when needed
- Monitor memory usage during builds

## 🔗 Related Links
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [act Documentation](https://github.com/nektos/act)
- [VS Code Build Documentation](https://github.com/microsoft/vscode/wiki/How-to-Contribute)