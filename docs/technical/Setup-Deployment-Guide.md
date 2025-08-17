# Setup & Deployment Guide - 7P Education Platform

## 🎯 Project Overview

7P Education Platform, **Next.js 15.4.4** ve **React 19.1.0** ile geliştirilmiş modern bir online education platform'udur. Amazon FBA ve E-ticaret eğitimi odaklı specialized content delivery ile niche market'te competitive advantage sağlar.

## 📋 System Requirements

### Development Environment
```yaml
Minimum Requirements:
  Node.js: ">=18.17.0"
  npm: ">=9.0.0"
  Memory: "8GB RAM"
  Storage: "10GB free space"
  OS: "macOS, Windows 10+, Linux Ubuntu 20.04+"

Recommended Environment:
  Node.js: "20.x LTS"
  npm: "10.x"
  Memory: "16GB RAM"
  Storage: "50GB SSD"
  OS: "macOS Sonoma, Windows 11, Ubuntu 22.04+"
  
Development Tools:
  VSCode: "Latest stable"
  Claude Code: "v1.0.72+"
  Git: ">=2.40.0"
  Chrome DevTools: "Latest"
```

### Production Environment
```yaml
Server Requirements:
  CPU: "4 cores minimum, 8 cores recommended"
  Memory: "16GB RAM minimum, 32GB recommended"
  Storage: "100GB SSD minimum"
  Network: "1Gbps connection"
  SSL: "TLS 1.3 certificate required"

Platform Support:
  Vercel: "Recommended deployment platform"
  Netlify: "Alternative deployment option"
  AWS: "EC2 + ALB for enterprise scale"
  Docker: "Containerized deployment ready"
```

## 🛠️ Technology Stack Details

### Frontend Stack
```typescript
// Core Framework
const frontendStack = {
  framework: {
    nextjs: "15.4.4",        // Latest with App Router
    react: "19.1.0",         // React 19 with new features
    typescript: "5.7.2",     // Full type safety
  },
  
  styling: {
    tailwindcss: "3.4.17",   // Modern utility-first CSS
    shadcn_ui: "latest",     // Accessible component library
    lucide_react: "0.534.0", // Icon library
    class_variance_authority: "0.7.1", // Type-safe styling variants
  },
  
  ui_components: {
    radix_ui: {
      alert_dialog: "1.1.14",
      avatar: "1.1.10", 
      checkbox: "1.3.2",
      dialog: "1.1.14",
      dropdown_menu: "2.1.15",
      label: "2.1.7",
      popover: "1.1.14",
      progress: "1.1.7",
      scroll_area: "1.2.9",
      select: "2.2.5",
      separator: "1.1.7",
      slider: "1.3.5",
      switch: "1.2.5",
      tabs: "1.1.12"
    }
  },
  
  state_management: {
    react_context: true,
    local_storage: true,
    session_storage: true,
    url_state: true
  }
};
```

### Backend & Infrastructure
```typescript
const backendStack = {
  // Authentication & Database
  supabase: {
    auth: "Full authentication system",
    database: "PostgreSQL with RLS",
    real_time: "WebSocket subscriptions",
    edge_functions: "Serverless functions"
  },
  
  // Payment Processing
  stripe: {
    version: "18.4.0",
    features: ["payments", "subscriptions", "webhooks", "customers"],
    react_integration: "3.9.0"
  },
  
  // Additional Services
  external_apis: {
    azure_msal: "4.18.0", // Microsoft authentication
    email_service: "Supabase Auth emails",
    analytics: "Built-in Next.js analytics"
  },
  
  // Data Architecture
  data_strategy: {
    primary: "Organized mock data",
    fallback: "Supabase PostgreSQL",
    caching: "Next.js built-in caching",
    cdn: "Vercel Edge Network"
  }
};
```

### Development Tools
```typescript
const devToolsStack = {
  code_quality: {
    eslint: "9.x",
    typescript_strict: true,
    prettier: "Integrated with Claude Code",
    husky: "Git hooks (optional)"
  },
  
  testing: {
    jest: "30.0.5",
    testing_library: "16.3.0",
    playwright: "1.54.1",
    coverage_threshold: "80%"
  },
  
  build_tools: {
    next_build: "Built-in optimization",
    postcss: "8.5.6",
    autoprefixer: "10.4.21",
    bundle_analyzer: "Optional"
  },
  
  ai_development: {
    claude_code: "v1.0.72",
    github_copilot: "Optional",
    typescript_ai: "Built-in IntelliSense"
  }
};
```

## 🚀 Local Development Setup

### 1. Environment Preparation
```bash
# System Check
node --version  # Should be >=18.17.0
npm --version   # Should be >=9.0.0
git --version   # Should be >=2.40.0

# Create project directory
mkdir 7p-education-workspace
cd 7p-education-workspace

# Clone repository
git clone <repository-url> 7peducation
cd 7peducation
```

### 2. Dependency Installation
```bash
# Install all dependencies
npm install

# Verify installation
npm ls --depth=0

# Optional: Install development tools globally
npm install -g @vercel/cli
npm install -g typescript
```

### 3. Environment Configuration
```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local with your values
```

#### Environment Variables
```bash
# .env.local configuration
# ========================

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_APP_NAME="7P Education Platform"
NEXT_PUBLIC_APP_VERSION="0.1.0"

# Supabase Configuration (Required for auth)
NEXT_PUBLIC_SUPABASE_URL=https://riupkkggupogdgubnhmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe Configuration (Required for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Azure MSAL Configuration (Optional)
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id

# Development Configuration
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_ANALYTICS_ENABLED=false

# Email Configuration (Supabase handles this)
NEXT_PUBLIC_FROM_EMAIL=noreply@7peducation.com
NEXT_PUBLIC_SUPPORT_EMAIL=destek@7peducation.com
```

### 4. Database Setup (Optional - Auth Only)
```bash
# Supabase CLI installation (optional)
npm install -g supabase

# Initialize Supabase (if needed)
supabase init

# Run migrations (only for auth tables)
supabase db push

# Seed data (only auth-related)
npm run db:seed:auth
```

### 5. Development Server
```bash
# Start development server
npm run dev

# Server will run on http://localhost:3003
# Hot reload enabled
# TypeScript checking enabled
```

#### Development Scripts
```json
{
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

## 🏗️ Project Structure

### Directory Architecture
```
7peducation/
├── 📁 src/                          # Source code
│   ├── 📁 app/                      # Next.js App Router
│   │   ├── 📄 layout.tsx            # Root layout
│   │   ├── 📄 page.tsx              # Homepage
│   │   ├── 📁 (auth)/               # Auth group routes
│   │   │   ├── 📄 login/            # Login page
│   │   │   ├── 📄 register/         # Registration
│   │   │   └── 📄 reset-password/   # Password reset
│   │   ├── 📁 dashboard/            # Student dashboard
│   │   ├── 📁 courses/              # Course pages
│   │   │   ├── 📄 page.tsx          # My courses
│   │   │   └── 📄 [courseId]/       # Individual course
│   │   ├── 📁 marketplace/          # Course marketplace
│   │   ├── 📁 library/              # Resource library
│   │   ├── 📁 discussions/          # Community forum
│   │   ├── 📁 settings/             # User settings
│   │   ├── 📁 admin/                # Admin panel
│   │   │   ├── 📄 dashboard/        # Admin dashboard
│   │   │   ├── 📄 courses/          # Course management
│   │   │   ├── 📄 users/            # User management
│   │   │   └── 📄 analytics/        # Analytics
│   │   └── 📁 api/                  # API routes
│   │       ├── 📁 auth/             # Authentication APIs
│   │       ├── 📁 courses/          # Course APIs
│   │       ├── 📁 payments/         # Payment APIs
│   │       └── 📁 webhooks/         # Webhook handlers
│   ├── 📁 components/               # React components
│   │   ├── 📁 ui/                   # Base UI components
│   │   │   ├── 📄 button.tsx        # Button component
│   │   │   ├── 📄 input.tsx         # Input component
│   │   │   ├── 📄 card.tsx          # Card component
│   │   │   ├── 📄 course-card.tsx   # Course card
│   │   │   └── 📄 ...               # Other UI components
│   │   ├── 📁 layout/               # Layout components
│   │   │   ├── 📄 DashboardLayout.tsx
│   │   │   ├── 📄 DashboardHeader.tsx
│   │   │   ├── 📄 DashboardSidebar.tsx
│   │   │   └── 📄 DashboardContent.tsx
│   │   ├── 📁 courses/              # Course components
│   │   │   ├── 📄 CourseModules.tsx
│   │   │   ├── 📄 LessonMaterials.tsx
│   │   │   └── 📄 LessonNotes.tsx
│   │   ├── 📁 quiz/                 # Quiz components
│   │   │   └── 📄 QuizComponent.tsx
│   │   ├── 📁 payments/             # Payment components
│   │   │   └── 📄 PaymentForm.tsx
│   │   ├── 📁 admin/                # Admin components
│   │   └── 📁 auth/                 # Auth components
│   ├── 📁 data/                     # Mock data (Organized)
│   │   ├── 📄 index.ts              # Central exports
│   │   ├── 📄 courses.ts            # Course data
│   │   ├── 📄 admin-users.ts        # User profiles
│   │   ├── 📄 discussions.ts        # Forum data
│   │   ├── 📄 library.ts            # Library resources
│   │   ├── 📄 quizzes.ts            # Quiz data
│   │   └── 📄 settings.ts           # Settings data
│   ├── 📁 lib/                      # Utility libraries
│   │   ├── 📄 supabase.ts           # Supabase client
│   │   ├── 📄 stripe.ts             # Stripe client
│   │   ├── 📄 auth/                 # Auth utilities
│   │   ├── 📄 payments.ts           # Payment utilities
│   │   └── 📄 enrollment.ts         # Enrollment logic
│   ├── 📁 types/                    # TypeScript types
│   │   ├── 📄 course.ts             # Course types
│   │   ├── 📄 user.ts               # User types
│   │   ├── 📄 quiz.ts               # Quiz types
│   │   └── 📄 payment.ts            # Payment types
│   ├── 📁 utils/                    # Utility functions
│   │   └── 📁 supabase/             # Supabase utilities
│   └── 📁 hooks/                    # Custom React hooks
├── 📁 docs/                         # Documentation
│   ├── 📄 CLAUDE_CODE_SETUP_RAPORU.md
│   ├── 📄 security-report.md
│   └── 📁 technical/                # Technical docs
│       ├── 📄 Main-Project-Analysis.md
│       ├── 📄 Frontend-Architecture-Report.md
│       ├── 📄 Backend-API-Report.md
│       ├── 📄 Database-Schema-Report.md
│       ├── 📄 Component-Library-Report.md
│       ├── 📄 Feature-Analysis-Report.md
│       ├── 📄 User-Journey-Report.md
│       └── 📄 Setup-Deployment-Guide.md
├── 📁 scripts/                      # Development scripts
│   ├── 📄 analyze-database.js
│   ├── 📄 deploy-auth-schema.js
│   ├── 📄 seed-course-data.js
│   └── 📄 validate-deployment.js
├── 📁 supabase/                     # Supabase configuration
│   ├── 📄 config.toml
│   └── 📁 migrations/
├── 📁 public/                       # Static assets
│   ├── 📄 favicon.ico
│   ├── 📁 images/
│   └── 📁 icons/
├── 📄 package.json                  # Dependencies
├── 📄 tsconfig.json                 # TypeScript config
├── 📄 tailwind.config.js            # Tailwind config
├── 📄 next.config.js                # Next.js config
├── 📄 .eslintrc.json                # ESLint config
├── 📄 .env.example                  # Environment template
└── 📄 README.md                     # Project overview
```

### Key Architecture Principles
```typescript
// Component Architecture
const architecturePrinciples = {
  component_structure: {
    atomic_design: "Atoms → Molecules → Organisms → Templates → Pages",
    composition: "Favor composition over inheritance",
    single_responsibility: "One component, one responsibility",
    reusability: "Maximum component reusability"
  },
  
  data_flow: {
    top_down: "Props flow down, events flow up",
    context_api: "Global state management",
    local_state: "Component-specific state",
    derived_state: "Computed values from props/state"
  },
  
  type_safety: {
    strict_typescript: "Strict mode enabled",
    interface_first: "Define interfaces before implementation",
    generic_types: "Reusable type definitions",
    runtime_validation: "Zod for runtime type checking"
  }
};
```

## 🔧 Configuration Files

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // App configuration
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Image optimization
  images: {
    domains: [
      'riupkkggupogdgubnhmy.supabase.co',
      'ui-avatars.com',
      'images.unsplash.com'
    ],
    formats: ['image/webp', 'image/avif']
  },
  
  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      }
    ];
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/data/*": ["./src/data/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Corporate Colors
        corporate: {
          50: 'hsl(214, 100%, 97%)',
          100: 'hsl(214, 95%, 93%)',
          200: 'hsl(214, 87%, 85%)',
          300: 'hsl(214, 84%, 73%)',
          400: 'hsl(214, 82%, 59%)',
          500: 'hsl(214, 84%, 56%)',
          600: 'hsl(214, 84%, 49%)',
          700: 'hsl(214, 84%, 42%)',
          800: 'hsl(214, 84%, 35%)',
          900: 'hsl(214, 84%, 28%)',
          950: 'hsl(214, 84%, 21%)',
        },
        
        // Semantic Colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## 🧪 Testing Setup

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/data/(.*)$': '<rootDir>/src/data/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 🚀 Deployment Options

### 1. Vercel Deployment (Recommended)

#### Automatic Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Project Configuration
```json
{
  "name": "7p-education-platform",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe-pub-key",
    "STRIPE_SECRET_KEY": "@stripe-secret-key"
  }
}
```

#### Environment Variables Setup
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

### 2. Netlify Deployment

#### Build Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  NODE_ENV = "production"
  NEXT_PUBLIC_APP_ENV = "production"
```

### 3. Docker Deployment

#### Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUB_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    volumes:
      - ./.env.local:/app/.env.local:ro
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: education_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 4. AWS Deployment

#### AWS Architecture
```yaml
Production Architecture:
  Frontend:
    Service: "AWS CloudFront + S3"
    Domain: "7peducation.com"
    SSL: "AWS Certificate Manager"
    
  Backend:
    Service: "AWS ECS Fargate"
    Database: "AWS RDS PostgreSQL"
    Cache: "AWS ElastiCache Redis"
    
  CDN:
    Service: "AWS CloudFront"
    Origin: "S3 + ALB"
    Edge Locations: "Global"
    
  Monitoring:
    Service: "AWS CloudWatch"
    Logging: "CloudWatch Logs"
    Alerts: "SNS + CloudWatch Alarms"
```

## 🔒 Security Configuration

### Content Security Policy
```typescript
// Security headers for production
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://riupkkggupogdgubnhmy.supabase.co https://api.stripe.com;
      media-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];
```

### Environment Security
```bash
# Production environment security checklist
✅ All secrets stored in environment variables
✅ No sensitive data in source code
✅ HTTPS enforced in production
✅ CORS properly configured
✅ Rate limiting implemented
✅ Input validation on all endpoints
✅ SQL injection prevention
✅ XSS protection enabled
✅ CSRF protection enabled
✅ Secure cookie settings
```

## 📊 Performance Optimization

### Build Optimization
```javascript
// next.config.js performance optimizations
const nextConfig = {
  // Bundle analyzer
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (process.env.ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      );
    }
    return config;
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    legacyBrowsers: false,
    browsersListForSwc: true,
  },
  
  // Compression
  compress: true,
  
  // Runtime optimization
  poweredByHeader: false,
  generateEtags: false,
};
```

### Performance Monitoring
```typescript
// Performance monitoring setup
export const performanceConfig = {
  web_vitals: {
    enabled: true,
    threshold: {
      fcp: 1800,    // First Contentful Paint
      lcp: 2500,    // Largest Contentful Paint
      fid: 100,     // First Input Delay
      cls: 0.1,     // Cumulative Layout Shift
      ttfb: 800,    // Time to First Byte
    }
  },
  
  monitoring: {
    analytics: 'Vercel Analytics',
    errors: 'Sentry (optional)',
    performance: 'Web Vitals',
    uptime: 'Uptime monitoring'
  }
};
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Run E2E tests
      run: npm run test:e2e
      
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-args: '--prod'
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🛠️ Development Workflow

### Git Workflow
```bash
# Development workflow
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new course management feature"
git push origin feature/new-feature

# Create pull request
# Code review and testing
# Merge to main
# Automatic deployment via Vercel
```

### Code Quality Gates
```bash
# Pre-commit hooks (optional)
npm install --save-dev husky lint-staged

# Package.json scripts
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  }
}
```

## 📈 Monitoring & Analytics

### Production Monitoring
```typescript
// Monitoring configuration
const monitoringConfig = {
  performance: {
    web_vitals: true,
    real_user_monitoring: true,
    synthetic_monitoring: true,
    performance_budgets: {
      fcp: '1.8s',
      lcp: '2.5s',
      fid: '100ms',
      cls: '0.1'
    }
  },
  
  error_tracking: {
    client_errors: true,
    server_errors: true,
    api_errors: true,
    user_feedback: true
  },
  
  business_metrics: {
    conversion_rates: true,
    user_engagement: true,
    course_completions: true,
    revenue_tracking: true
  }
};
```

### Health Checks
```typescript
// Health check endpoints
export async function GET() {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseHealth();
    
    // Check external services
    const stripeStatus = await checkStripeHealth();
    const supabaseStatus = await checkSupabaseHealth();
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        stripe: stripeStatus,
        supabase: supabaseStatus
      },
      version: process.env.npm_package_version
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Development Issues
```bash
# Port already in use
Error: EADDRINUSE: address already in use :::3003
Solution: killall -9 node && npm run dev

# Module not found
Error: Cannot resolve module '@/components/...'
Solution: Check tsconfig.json paths configuration

# Build errors
Error: Type errors in build
Solution: npm run type-check && fix TypeScript errors

# Environment variables not loading
Error: Environment variable undefined
Solution: Check .env.local file and restart dev server
```

#### Production Issues
```bash
# Deployment fails
Error: Build failed
Solution: 
1. Check environment variables in deployment platform
2. Verify all dependencies are in package.json
3. Check build logs for specific errors

# 404 errors on page refresh
Error: 404 on direct URL access
Solution: Configure platform for SPA routing
- Vercel: Automatic with Next.js
- Netlify: Add _redirects file
- Apache: Configure .htaccess

# API routes not working
Error: API route returns 404
Solution:
1. Verify API route file structure
2. Check deployment platform API support
3. Ensure environment variables are set
```

#### Performance Issues
```bash
# Slow page loads
Issue: Pages loading slowly
Solution:
1. Enable Next.js Image optimization
2. Implement code splitting
3. Use dynamic imports for heavy components
4. Enable CDN for static assets

# Large bundle size
Issue: Bundle too large
Solution:
1. Run bundle analyzer: npm run analyze
2. Remove unused dependencies
3. Implement dynamic imports
4. Use tree shaking
```

### Debug Commands
```bash
# Development debugging
npm run dev -- --turbo          # Enable Turbo for faster builds
npm run build -- --debug        # Debug build process
npm run test -- --verbose       # Verbose test output
npm run test:e2e -- --headed    # Run E2E tests with browser

# Production debugging
vercel logs                      # View deployment logs
vercel env ls                    # List environment variables
vercel inspect                   # Inspect deployment
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
```bash
# Weekly tasks
npm audit && npm audit fix       # Security updates
npm outdated                     # Check for updates
npm run test:all                 # Full test suite

# Monthly tasks
npm update                       # Update dependencies
npm run build                    # Test build process
npm run test:e2e                 # E2E testing
```

### Backup Strategy
```bash
# Database backup (if using direct PostgreSQL)
pg_dump education_platform > backup.sql

# Environment backup
cp .env.local .env.backup

# Code backup
git push origin main             # Ensure code is in remote repo
```

### Contact Information
```yaml
Development Team:
  Lead Developer: "Furkan Yiğit"
  AI Assistant: "Claude Code v1.0.72"
  
Support Channels:
  GitHub Issues: "Primary support channel"
  Email: "development@7peducation.com"
  
Documentation:
  Technical Docs: "/docs/technical/"
  API Docs: "/docs/api/"
  User Guide: "/docs/user-guide/"
```

---

**Setup Complete! 🎉**

Bu comprehensive setup guide ile 7P Education Platform'u local development'dan production deployment'a kadar başarıyla kurup çalıştırabilirsiniz. Her adım detaylı olarak açıklanmış ve troubleshooting bilgileri sağlanmıştır.