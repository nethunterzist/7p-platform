# CI/CD Pipeline Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Source Control Integration](#source-control-integration)
4. [Automated Testing Integration](#automated-testing-integration)
5. [Build Automation](#build-automation)
6. [Deployment Automation](#deployment-automation)
7. [Environment Management](#environment-management)
8. [Security Integration](#security-integration)
9. [Monitoring and Notifications](#monitoring-and-notifications)
10. [Pipeline Optimization](#pipeline-optimization)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Best Practices](#best-practices)

## Overview

This guide provides comprehensive instructions for setting up robust CI/CD pipelines for the 7P Education Platform. It covers automated testing, building, deployment, and monitoring across multiple environments while maintaining high code quality and security standards.

### CI/CD Objectives
- **Automated Quality Gates**: Ensure code quality through automated testing and analysis
- **Fast Feedback Loops**: Provide rapid feedback to developers on code changes
- **Consistent Deployments**: Standardize deployment processes across environments
- **Security Integration**: Embed security scanning throughout the pipeline
- **Rollback Capability**: Enable quick recovery from deployment issues
- **Compliance Tracking**: Maintain audit trails for regulatory compliance

### Pipeline Architecture Overview
```
┌─────────────────────────────────────────────────┐
│              Source Control                     │
│  • GitHub/GitLab repositories                  │
│  • Branch protection rules                     │
│  • Pull request workflows                      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│               CI Pipeline                       │
│  • Code quality checks                         │
│  • Automated testing                           │
│  • Security scanning                           │
│  • Build artifacts                             │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              CD Pipeline                        │
│  • Environment provisioning                    │
│  • Database migrations                         │
│  • Application deployment                      │
│  • Smoke testing                               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│          Monitoring & Feedback                  │
│  • Deployment status                           │
│  • Performance metrics                         │
│  • Error tracking                              │
│  • Rollback triggers                           │
└─────────────────────────────────────────────────┘
```

## Pipeline Architecture

### Multi-Stage Pipeline Design

```yaml
# .github/workflows/ci-cd-pipeline.yml
name: 7P Education CI/CD Pipeline

on:
  push:
    branches: [main, develop, 'release/*', 'hotfix/*']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production
      skip_tests:
        description: 'Skip test execution'
        required: false
        default: false
        type: boolean

env:
  NODE_VERSION: '18.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Stage 1: Code Quality & Security
  code-quality:
    name: 'Code Quality & Security'
    runs-on: ubuntu-latest
    outputs:
      quality-gate: ${{ steps.quality-check.outputs.passed }}
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0 # Full history for SonarQube
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install Dependencies
      run: npm ci
    
    - name: Lint Check
      run: |
        npm run lint
        npm run lint:security
    
    - name: Code Formatting Check
      run: npm run format:check
    
    - name: Type Check
      run: npm run type-check
    
    - name: SonarQube Analysis
      uses: sonarqube-quality-gate-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
    
    - name: Security Vulnerability Scan
      run: |
        npm audit --audit-level=high
        npx snyk test --severity-threshold=high
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
    
    - name: License Compliance Check
      run: npx license-checker --summary
    
    - name: Quality Gate Check
      id: quality-check
      run: |
        # Check if all quality gates passed
        echo "passed=true" >> $GITHUB_OUTPUT

  # Stage 2: Automated Testing
  testing:
    name: 'Automated Testing'
    runs-on: ubuntu-latest
    needs: code-quality
    if: needs.code-quality.outputs.quality-gate == 'true'
    
    services:
      mongodb:
        image: mongo:7.0
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpass
        ports:
          - 27017:27017
      
      postgresql:
        image: postgres:14
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install Dependencies
      run: npm ci
    
    - name: Setup Test Environment
      run: |
        cp .env.test.example .env.test
        npm run db:setup:test
    
    - name: Unit Tests
      run: |
        npm run test:unit -- --coverage --watchAll=false
      env:
        CI: true
    
    - name: Integration Tests
      run: |
        npm run test:integration -- --coverage --watchAll=false
      env:
        CI: true
        MONGODB_URI: mongodb://testuser:testpass@localhost:27017/test_db
        POSTGRESQL_URI: postgresql://testuser:testpass@localhost:5432/test_db
        REDIS_URI: redis://localhost:6379/0
    
    - name: API Tests
      run: |
        npm run test:api -- --coverage --watchAll=false
      env:
        CI: true
        API_BASE_URL: http://localhost:3000
    
    - name: E2E Tests
      run: |
        npm run test:e2e
      env:
        CI: true
        HEADLESS: true
    
    - name: Performance Tests
      run: |
        npm run test:performance
      env:
        CI: true
    
    - name: Upload Test Coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Test Results Summary
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Test Results
        path: 'test-results/*.xml'
        reporter: jest-junit

  # Stage 3: Build & Package
  build:
    name: 'Build & Package'
    runs-on: ubuntu-latest
    needs: [code-quality, testing]
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
      image-tag: ${{ steps.meta.outputs.tags }}
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install Dependencies
      run: npm ci --only=production
    
    - name: Build Application
      run: |
        npm run build
        npm run build:docs
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract Metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-
    
    - name: Build and Push Container Image
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile.production
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Generate SBOM
      uses: anchore/sbom-action@v0
      with:
        image: ${{ steps.meta.outputs.tags }}
        format: spdx-json
        output-file: sbom.spdx.json
    
    - name: Upload Build Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: |
          dist/
          sbom.spdx.json
          package-lock.json

  # Stage 4: Security Scanning
  security-scan:
    name: 'Security Scanning'
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - name: Run Container Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ needs.build.outputs.image-tag }}
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy Results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: '7p-education'
        path: '.'
        format: 'ALL'
    
    - name: Upload OWASP Results
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-report
        path: reports/

  # Stage 5: Deploy to Staging
  deploy-staging:
    name: 'Deploy to Staging'
    runs-on: ubuntu-latest
    needs: [build, security-scan]
    if: github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch'
    environment: staging
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
    
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
    
    - name: Deploy to ECS Staging
      run: |
        # Update ECS service with new image
        aws ecs update-service \
          --cluster 7p-education-staging \
          --service 7p-education-api \
          --task-definition 7p-education-api:latest \
          --force-new-deployment
    
    - name: Wait for Deployment
      run: |
        aws ecs wait services-stable \
          --cluster 7p-education-staging \
          --services 7p-education-api
    
    - name: Run Smoke Tests
      run: |
        npm run test:smoke -- --env=staging
      env:
        STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
    
    - name: Update Deployment Status
      run: |
        echo "Staging deployment completed successfully"
        echo "::notice::Staging deployment completed at $(date)"

  # Stage 6: Deploy to Production
  deploy-production:
    name: 'Deploy to Production'
    runs-on: ubuntu-latest
    needs: [build, security-scan, deploy-staging]
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')
    environment: production
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
    
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
    
    - name: Blue-Green Deployment
      run: |
        # Run blue-green deployment script
        ./scripts/blue-green-deploy.sh ${{ needs.build.outputs.image-tag }}
    
    - name: Production Smoke Tests
      run: |
        npm run test:smoke -- --env=production
      env:
        PRODUCTION_API_URL: ${{ secrets.PRODUCTION_API_URL }}
    
    - name: Send Deployment Notification
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: 'Production deployment completed successfully! 🚀'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Source Control Integration

### Git Workflow Strategy

```bash
#!/bin/bash
# git-workflow-setup.sh - Configure Git workflow for 7P Education

# Branch protection rules setup
setup_branch_protection() {
    echo "Setting up branch protection rules..."
    
    # Main branch protection
    gh api repos/:owner/:repo/branches/main/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"contexts":["code-quality","testing","security-scan"]}' \
        --field enforce_admins=true \
        --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
        --field restrictions='{"users":[],"teams":["senior-developers"],"apps":[]}'
    
    # Develop branch protection
    gh api repos/:owner/:repo/branches/develop/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"contexts":["code-quality","testing"]}' \
        --field enforce_admins=false \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}'
}

# Commit message conventions
setup_commit_hooks() {
    echo "Setting up commit hooks..."
    
    # Install commitizen
    npm install -g commitizen
    npm install -g cz-conventional-changelog
    
    # Configure commitizen
    echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
    
    # Setup pre-commit hooks
    cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run security checks
npm audit --audit-level=moderate

# Run tests on changed files
npm run test:changed
EOF
    
    chmod +x .husky/pre-commit
}

# Pull request templates
setup_pr_templates() {
    echo "Setting up PR templates..."
    
    mkdir -p .github/pull_request_template
    
    cat > .github/pull_request_template/feature.md << 'EOF'
## Feature Description
Brief description of the feature being added.

## Changes Made
- [ ] New feature implementation
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Database migrations (if applicable)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Security Considerations
- [ ] Security review completed
- [ ] No sensitive data exposed
- [ ] Authentication/authorization updated

## Deployment Notes
- [ ] Environment variables updated
- [ ] Configuration changes documented
- [ ] Rollback plan documented

## Related Issues
Closes #issue_number
EOF

    cat > .github/pull_request_template/bugfix.md << 'EOF'
## Bug Description
Description of the bug being fixed.

## Root Cause
Explanation of what caused the bug.

## Solution
Description of how the bug was fixed.

## Testing
- [ ] Bug reproduction test added
- [ ] Fix verified in multiple environments
- [ ] Regression tests updated

## Risk Assessment
- [ ] Low risk change
- [ ] Backward compatible
- [ ] No breaking changes
EOF
}

# Automated changelog generation
setup_changelog() {
    echo "Setting up automated changelog..."
    
    npm install --save-dev conventional-changelog-cli
    
    # Add changelog script to package.json
    npm pkg set scripts.changelog="conventional-changelog -p angular -i CHANGELOG.md -s"
    npm pkg set scripts.release="npm run changelog && git add CHANGELOG.md"
}

# Execute setup
setup_branch_protection
setup_commit_hooks
setup_pr_templates
setup_changelog

echo "Git workflow setup completed!"
```

### Code Review Automation

```javascript
// .github/workflows/code-review.yml
name: Automated Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  automated-review:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: AI Code Review
      uses: coderabbitai/ai-pr-reviewer@latest
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      with:
        debug: false
        review_simple_changes: false
        review_comment_lgtm: false
    
    - name: Code Complexity Analysis
      run: |
        npx complexity-report --format json --output complexity.json src/
        npx danger ci
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Performance Impact Analysis
      run: |
        # Analyze bundle size changes
        npm run build
        npx bundlesize
    
    - name: Security Review
      run: |
        # Check for security patterns
        npx eslint . --ext .js,.ts --config .eslintrc.security.js
        
        # Check for secrets
        npx secretlint "**/*"
```

## Automated Testing Integration

### Test Automation Framework

```javascript
// jest.config.js - Comprehensive Jest configuration
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/**/__tests__/**'
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      globalSetup: '<rootDir>/tests/integration/setup.js',
      globalTeardown: '<rootDir>/tests/integration/teardown.js',
      setupFilesAfterEnv: ['<rootDir>/tests/integration/jest.setup.js']
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/tests/api/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      globalSetup: '<rootDir>/tests/api/setup.js',
      globalTeardown: '<rootDir>/tests/api/teardown.js'
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      runner: '@jest-runner/electron',
      setupFilesAfterEnv: ['<rootDir>/tests/e2e/jest.setup.js']
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**'
  ]
};
```

### Test Data Management

```javascript
// tests/utils/test-data-factory.js
class TestDataFactory {
    constructor() {
        this.sequences = new Map();
        this.fixtures = new Map();
    }
    
    // User data factory
    createUser(overrides = {}) {
        const sequence = this.getSequence('user');
        return {
            id: `user_${sequence}`,
            email: `user${sequence}@test.com`,
            firstName: `First${sequence}`,
            lastName: `Last${sequence}`,
            role: 'student',
            isActive: true,
            createdAt: new Date(),
            ...overrides
        };
    }
    
    // Course data factory
    createCourse(overrides = {}) {
        const sequence = this.getSequence('course');
        return {
            id: `course_${sequence}`,
            title: `Test Course ${sequence}`,
            description: `Description for test course ${sequence}`,
            instructorId: this.createUser({ role: 'instructor' }).id,
            price: 99.99,
            status: 'published',
            createdAt: new Date(),
            ...overrides
        };
    }
    
    // Database seeding
    async seedDatabase(db) {
        console.log('Seeding test database...');
        
        // Create test users
        const users = [
            this.createUser({ role: 'admin', email: 'admin@test.com' }),
            this.createUser({ role: 'instructor', email: 'instructor@test.com' }),
            this.createUser({ role: 'student', email: 'student@test.com' })
        ];
        
        await db.collection('users').insertMany(users);
        
        // Create test courses
        const courses = [
            this.createCourse({ instructorId: users[1].id }),
            this.createCourse({ instructorId: users[1].id, status: 'draft' })
        ];
        
        await db.collection('courses').insertMany(courses);
        
        console.log('Database seeded successfully');
        return { users, courses };
    }
    
    getSequence(type) {
        const current = this.sequences.get(type) || 0;
        const next = current + 1;
        this.sequences.set(type, next);
        return next;
    }
    
    reset() {
        this.sequences.clear();
        this.fixtures.clear();
    }
}

module.exports = new TestDataFactory();
```

### Parallel Test Execution

```javascript
// tests/parallel-runner.js
class ParallelTestRunner {
    constructor(config) {
        this.config = config;
        this.workers = config.workers || os.cpus().length;
        this.testQueue = [];
        this.results = [];
    }
    
    async runTests(testSuites) {
        console.log(`Running tests with ${this.workers} workers`);
        
        // Divide test suites among workers
        const chunks = this.chunkArray(testSuites, this.workers);
        
        // Run test chunks in parallel
        const promises = chunks.map((chunk, index) => 
            this.runWorker(index, chunk));
        
        const workerResults = await Promise.all(promises);
        
        // Aggregate results
        return this.aggregateResults(workerResults);
    }
    
    async runWorker(workerId, testChunk) {
        console.log(`Worker ${workerId}: Running ${testChunk.length} test suites`);
        
        const worker = new Worker('./test-worker.js', {
            workerData: {
                workerId,
                testChunk,
                config: this.config
            }
        });
        
        return new Promise((resolve, reject) => {
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker ${workerId} exited with code ${code}`));
                }
            });
        });
    }
    
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    
    aggregateResults(workerResults) {
        const aggregated = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            coverage: {
                lines: { total: 0, covered: 0 },
                functions: { total: 0, covered: 0 },
                branches: { total: 0, covered: 0 },
                statements: { total: 0, covered: 0 }
            },
            duration: 0,
            suites: []
        };
        
        for (const result of workerResults) {
            aggregated.totalTests += result.totalTests;
            aggregated.passedTests += result.passedTests;
            aggregated.failedTests += result.failedTests;
            aggregated.skippedTests += result.skippedTests;
            aggregated.duration = Math.max(aggregated.duration, result.duration);
            aggregated.suites.push(...result.suites);
            
            // Aggregate coverage
            for (const metric of ['lines', 'functions', 'branches', 'statements']) {
                aggregated.coverage[metric].total += result.coverage[metric].total;
                aggregated.coverage[metric].covered += result.coverage[metric].covered;
            }
        }
        
        // Calculate coverage percentages
        for (const metric of Object.keys(aggregated.coverage)) {
            const { total, covered } = aggregated.coverage[metric];
            aggregated.coverage[metric].percentage = total > 0 ? (covered / total) * 100 : 0;
        }
        
        return aggregated;
    }
}
```

## Build Automation

### Multi-Stage Build Process

```dockerfile
# Dockerfile.production - Multi-stage production build
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM node:18-alpine AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build stage
FROM dev-deps AS build
WORKDIR /app
COPY . .
RUN npm run build
RUN npm run build:docs
RUN npm prune --production

# Test stage
FROM build AS test
ENV NODE_ENV=test
RUN npm ci
COPY tests/ ./tests/
RUN npm run test:unit
RUN npm run test:integration

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

USER nextjs
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Build Optimization

```javascript
// build/webpack.config.production.js
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    mode: 'production',
    target: 'node',
    entry: {
        server: './src/server.ts',
        worker: './src/worker.ts'
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].js',
        clean: true
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, '../src')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.build.json',
                            transpileOnly: true
                        }
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
        }),
        new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8
        }),
        ...(process.env.ANALYZE_BUNDLE ? [new BundleAnalyzerPlugin()] : [])
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true
                    },
                    mangle: {
                        keep_fnames: true
                    }
                }
            })
        ],
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    externals: [
        // Exclude Node.js built-ins
        /^[a-z][a-z0-9-]*$/
    ],
    stats: {
        chunks: false,
        modules: false,
        assets: true,
        warnings: true,
        errors: true
    }
};
```

## Deployment Automation

### Environment-Specific Deployments

```bash
#!/bin/bash
# deploy-environment.sh - Environment-specific deployment script

set -euo pipefail

ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}

# Environment configurations
declare -A ENVIRONMENTS=(
    ["staging"]="7p-education-staging"
    ["production"]="7p-education-production"
)

declare -A CLUSTERS=(
    ["staging"]="staging-cluster"
    ["production"]="production-cluster"
)

# Deployment functions
deploy_to_ecs() {
    local env=$1
    local tag=$2
    
    echo "Deploying to ECS environment: $env"
    
    # Update task definition
    aws ecs describe-task-definition \
        --task-definition ${ENVIRONMENTS[$env]} \
        --query taskDefinition > task-def.json
    
    # Update image tag in task definition
    jq --arg IMAGE_URI "${ECR_REGISTRY}/${ECR_REPOSITORY}:${tag}" \
       '.containerDefinitions[0].image = $IMAGE_URI' \
       task-def.json > updated-task-def.json
    
    # Remove unnecessary fields
    jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
       updated-task-def.json > final-task-def.json
    
    # Register new task definition
    aws ecs register-task-definition \
        --cli-input-json file://final-task-def.json
    
    # Update service
    aws ecs update-service \
        --cluster ${CLUSTERS[$env]} \
        --service ${ENVIRONMENTS[$env]} \
        --task-definition ${ENVIRONMENTS[$env]} \
        --force-new-deployment
    
    # Wait for deployment to complete
    echo "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster ${CLUSTERS[$env]} \
        --services ${ENVIRONMENTS[$env]}
}

deploy_to_kubernetes() {
    local env=$1
    local tag=$2
    
    echo "Deploying to Kubernetes environment: $env"
    
    # Set kubectl context
    kubectl config use-context ${CLUSTERS[$env]}
    
    # Update deployment image
    kubectl set image deployment/7p-education-api \
        api=${ECR_REGISTRY}/${ECR_REPOSITORY}:${tag} \
        -n ${env}
    
    # Wait for rollout to complete
    kubectl rollout status deployment/7p-education-api -n ${env} --timeout=600s
    
    # Verify deployment
    kubectl get pods -n ${env} -l app=7p-education-api
}

run_health_checks() {
    local env=$1
    
    echo "Running health checks for $env environment..."
    
    # Get service endpoint
    local endpoint
    if [[ "$env" == "staging" ]]; then
        endpoint="https://staging-api.7peducation.com"
    else
        endpoint="https://api.7peducation.com"
    fi
    
    # Health check with retries
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        echo "Health check attempt $attempt/$max_attempts"
        
        if curl -sf "$endpoint/health" > /dev/null; then
            echo "✅ Health check passed"
            return 0
        fi
        
        echo "⏳ Waiting for service to be ready..."
        sleep 10
        ((attempt++))
    done
    
    echo "❌ Health checks failed"
    return 1
}

run_smoke_tests() {
    local env=$1
    
    echo "Running smoke tests for $env environment..."
    
    # Run environment-specific smoke tests
    npm run test:smoke -- --env=$env
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Smoke tests passed"
    else
        echo "❌ Smoke tests failed"
        return 1
    fi
}

rollback_deployment() {
    local env=$1
    
    echo "Rolling back deployment for $env environment..."
    
    # Get previous task definition
    local previous_task_def=$(aws ecs list-task-definitions \
        --family-prefix ${ENVIRONMENTS[$env]} \
        --status ACTIVE \
        --sort DESC \
        --query 'taskDefinitionArns[1]' \
        --output text)
    
    if [[ "$previous_task_def" != "None" ]]; then
        # Update service to previous task definition
        aws ecs update-service \
            --cluster ${CLUSTERS[$env]} \
            --service ${ENVIRONMENTS[$env]} \
            --task-definition $previous_task_def
        
        echo "✅ Rollback completed"
    else
        echo "❌ No previous task definition found"
        return 1
    fi
}

send_notification() {
    local env=$1
    local status=$2
    local message=$3
    
    # Send Slack notification
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Deployment to $env: $status\n$message\"}" \
        $SLACK_WEBHOOK_URL
}

# Main deployment flow
main() {
    echo "Starting deployment to $ENVIRONMENT environment"
    echo "Image tag: $IMAGE_TAG"
    
    # Set environment variables
    export ECR_REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
    export ECR_REPOSITORY=7p-education
    
    # Deploy based on infrastructure type
    if [[ "${INFRA_TYPE:-ecs}" == "kubernetes" ]]; then
        deploy_to_kubernetes $ENVIRONMENT $IMAGE_TAG
    else
        deploy_to_ecs $ENVIRONMENT $IMAGE_TAG
    fi
    
    # Run health checks
    if run_health_checks $ENVIRONMENT; then
        echo "✅ Health checks passed"
    else
        echo "❌ Health checks failed, initiating rollback"
        rollback_deployment $ENVIRONMENT
        send_notification $ENVIRONMENT "FAILED" "Deployment failed health checks and was rolled back"
        exit 1
    fi
    
    # Run smoke tests
    if run_smoke_tests $ENVIRONMENT; then
        echo "✅ Smoke tests passed"
        send_notification $ENVIRONMENT "SUCCESS" "Deployment completed successfully"
    else
        echo "❌ Smoke tests failed, consider rollback"
        send_notification $ENVIRONMENT "WARNING" "Deployment completed but smoke tests failed"
        exit 1
    fi
    
    echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
}

# Execute main function
main
```

## Pipeline Optimization

### Caching Strategies

```yaml
# .github/workflows/optimized-pipeline.yml
name: Optimized CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
    
    - name: Setup Node.js with Caching
      uses: actions/setup-node@v4
      with:
        node-version: '18.x'
        cache: 'npm'
        cache-dependency-path: |
          package-lock.json
          api/package-lock.json
          frontend/package-lock.json
    
    - name: Cache Dependencies
      uses: actions/cache@v3
      with:
        path: |
          ~/.npm
          node_modules
          */node_modules
        key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-npm-
    
    - name: Cache Build Artifacts
      uses: actions/cache@v3
      with:
        path: |
          dist/
          .next/
          build/
        key: ${{ runner.os }}-build-${{ github.sha }}
        restore-keys: |
          ${{ runner.os }}-build-
    
    - name: Cache Test Results
      uses: actions/cache@v3
      with:
        path: |
          coverage/
          test-results/
        key: ${{ runner.os }}-tests-${{ hashFiles('src/**/*.{js,ts}', 'tests/**/*.{js,ts}') }}
        restore-keys: |
          ${{ runner.os }}-tests-
    
    - name: Install Dependencies
      run: |
        if [ -f "node_modules/.package-lock.json" ]; then
          echo "Using cached dependencies"
        else
          npm ci
        fi
    
    - name: Build Application
      run: |
        if [ -d "dist" ] && [ "$(find dist -newer package.json)" ]; then
          echo "Using cached build"
        else
          npm run build
        fi
```

### Pipeline Monitoring

```javascript
// scripts/pipeline-monitor.js
class PipelineMonitor {
    constructor() {
        this.metrics = {
            buildTimes: [],
            testTimes: [],
            deploymentTimes: [],
            failureRates: new Map(),
            queueTimes: []
        };
        
        this.thresholds = {
            buildTime: 10 * 60 * 1000, // 10 minutes
            testTime: 15 * 60 * 1000,  // 15 minutes
            deploymentTime: 20 * 60 * 1000, // 20 minutes
            failureRate: 0.1 // 10%
        };
    }
    
    async collectMetrics(pipelineRun) {
        const metrics = {
            runId: pipelineRun.id,
            totalDuration: pipelineRun.duration,
            stages: {}
        };
        
        for (const stage of pipelineRun.stages) {
            metrics.stages[stage.name] = {
                duration: stage.duration,
                status: stage.status,
                startTime: stage.startTime,
                endTime: stage.endTime,
                queueTime: stage.startTime - pipelineRun.createdAt
            };
            
            // Update running metrics
            this.updateRunningMetrics(stage);
        }
        
        // Store metrics
        await this.storeMetrics(metrics);
        
        // Check for alerts
        await this.checkAlerts(metrics);
        
        return metrics;
    }
    
    updateRunningMetrics(stage) {
        switch (stage.name) {
            case 'build':
                this.metrics.buildTimes.push(stage.duration);
                break;
            case 'test':
                this.metrics.testTimes.push(stage.duration);
                break;
            case 'deploy':
                this.metrics.deploymentTimes.push(stage.duration);
                break;
        }
        
        // Track failure rates
        const dayKey = new Date().toISOString().split('T')[0];
        if (!this.metrics.failureRates.has(dayKey)) {
            this.metrics.failureRates.set(dayKey, { total: 0, failures: 0 });
        }
        
        const dayMetrics = this.metrics.failureRates.get(dayKey);
        dayMetrics.total++;
        if (stage.status === 'failed') {
            dayMetrics.failures++;
        }
        
        // Keep only last 100 entries
        if (this.metrics.buildTimes.length > 100) {
            this.metrics.buildTimes.shift();
        }
    }
    
    async checkAlerts(metrics) {
        const alerts = [];
        
        // Check build time threshold
        if (metrics.stages.build?.duration > this.thresholds.buildTime) {
            alerts.push({
                type: 'slow_build',
                message: `Build took ${metrics.stages.build.duration / 1000}s (threshold: ${this.thresholds.buildTime / 1000}s)`,
                severity: 'warning'
            });
        }
        
        // Check failure rate
        const today = new Date().toISOString().split('T')[0];
        const todayMetrics = this.metrics.failureRates.get(today);
        if (todayMetrics) {
            const failureRate = todayMetrics.failures / todayMetrics.total;
            if (failureRate > this.thresholds.failureRate) {
                alerts.push({
                    type: 'high_failure_rate',
                    message: `Failure rate: ${(failureRate * 100).toFixed(1)}% (threshold: ${this.thresholds.failureRate * 100}%)`,
                    severity: 'critical'
                });
            }
        }
        
        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }
    }
    
    generateReport() {
        const now = Date.now();
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);
        
        return {
            buildMetrics: {
                averageTime: this.average(this.metrics.buildTimes),
                p95Time: this.percentile(this.metrics.buildTimes, 95),
                count: this.metrics.buildTimes.length
            },
            testMetrics: {
                averageTime: this.average(this.metrics.testTimes),
                p95Time: this.percentile(this.metrics.testTimes, 95),
                count: this.metrics.testTimes.length
            },
            deploymentMetrics: {
                averageTime: this.average(this.metrics.deploymentTimes),
                p95Time: this.percentile(this.metrics.deploymentTimes, 95),
                count: this.metrics.deploymentTimes.length
            },
            failureRates: Object.fromEntries(this.metrics.failureRates),
            generatedAt: new Date().toISOString()
        };
    }
    
    average(numbers) {
        return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
    }
    
    percentile(numbers, p) {
        if (numbers.length === 0) return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index];
    }
}

module.exports = PipelineMonitor;
```

This comprehensive CI/CD pipeline setup provides automated testing, building, deployment, and monitoring for the 7P Education Platform, ensuring high code quality and reliable deployments across all environments.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Create production-deployment-guide.md with comprehensive deployment strategies", "status": "completed"}, {"id": "2", "content": "Create ci-cd-pipeline-setup.md with automated pipeline configuration", "status": "completed"}, {"id": "3", "content": "Create docker-containerization.md with container orchestration guide", "status": "in_progress"}, {"id": "4", "content": "Create kubernetes-orchestration.md with K8s deployment patterns", "status": "pending"}, {"id": "5", "content": "Create monitoring-logging-setup.md with observability implementation", "status": "pending"}, {"id": "6", "content": "Create backup-disaster-recovery.md with resilience strategies", "status": "pending"}, {"id": "7", "content": "Create infrastructure-as-code.md with IaC implementation", "status": "pending"}, {"id": "8", "content": "Create performance-optimization.md with production tuning guide", "status": "pending"}]