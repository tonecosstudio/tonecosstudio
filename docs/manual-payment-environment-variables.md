# Environment Variables - Manual Payment System

## Overview

This document lists all environment variables required for the Manual Payment System, including their purpose, format, and where to obtain them.

## Required Variables

### Supabase Configuration

#### VITE_SUPABASE_URL

**Purpose**: URL of your Supabase project

**Format**: `https://[project-id].supabase.co`

**Example**: `https://pabxpvqwtvbjaunjejud.supabase.co`

**Where to find**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy "Project URL"

**Required**: Yes

**Used by**:
- Supabase client initialization
- API calls
- Storage operations
- Real-time subscriptions

---

#### VITE_SUPABASE_PUBLISHABLE_KEY

**Purpose**: Anonymous/public key for client-side Supabase access

**Format**: JWT token (long string starting with `eyJ`)

**Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Where to find**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy "anon public" key

**Required**: Yes

**Used by**:
- Client-side authentication
- RLS policy enforcement
- Public API access

**Security**: Safe to expose in client-side code (protected by RLS)

---

#### VITE_SUPABASE_PROJECT_ID

**Purpose**: Unique identifier for your Supabase project

**Format**: Alphanumeric string

**Example**: `pabxpvqwtvbjaunjejud`

**Where to find**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Project ID is in the URL: `app.supabase.com/project/[project-id]`
4. Or in Settings > General

**Required**: Optional (but recommended for debugging)

**Used by**:
- Error tracking
- Analytics
- Debugging

---

### Supabase Edge Functions (Server-side)

#### SUPABASE_URL

**Purpose**: Same as VITE_SUPABASE_URL but for server-side functions

**Format**: `https://[project-id].supabase.co`

**Where to find**: Same as VITE_SUPABASE_URL

**Required**: Yes (for Edge Functions)

**Used by**:
- Supabase Edge Functions
- Server-side operations

---

#### SUPABASE_ANON_KEY

**Purpose**: Same as VITE_SUPABASE_PUBLISHABLE_KEY but for server-side

**Format**: JWT token

**Where to find**: Same as VITE_SUPABASE_PUBLISHABLE_KEY

**Required**: Yes (for Edge Functions)

**Used by**:
- Edge Functions authentication
- Server-side RLS enforcement

---

#### SUPABASE_SERVICE_ROLE_KEY

**Purpose**: Service role key with full database access (bypasses RLS)

**Format**: JWT token (long string starting with `eyJ`)

**Where to find**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy "service_role" key (click "Reveal" first)

**Required**: Yes (for admin operations in Edge Functions)

**Used by**:
- Admin operations that bypass RLS
- Bulk operations
- System-level operations

**Security**: ⚠️ **NEVER expose in client-side code!** Keep secret!

---

## Optional Variables

### Error Tracking

#### VITE_SENTRY_DSN

**Purpose**: Sentry Data Source Name for error tracking

**Format**: `https://[key]@[organization].ingest.sentry.io/[project]`

**Example**: `https://abc123@o123456.ingest.sentry.io/7890123`

**Where to find**:
1. Go to [Sentry Dashboard](https://sentry.io)
2. Create a project (if not exists)
3. Go to Settings > Projects > [Your Project] > Client Keys (DSN)
4. Copy DSN

**Required**: No (but highly recommended for production)

**Used by**:
- Error tracking
- Performance monitoring
- User feedback

**Setup**:
```bash
# Install Sentry
npm install @sentry/react

# Configure in src/lib/sentry.tsx
```

---

#### VITE_APP_VERSION

**Purpose**: Application version for error tracking and analytics

**Format**: Semantic version (e.g., `1.0.0`)

**Example**: `1.0.0`

**Where to set**: In `.env` file or CI/CD pipeline

**Required**: No

**Used by**:
- Sentry release tracking
- Analytics
- Debugging

**Default**: `1.0.0`

---

### Email Configuration

#### VITE_EMAIL_SERVICE_URL

**Purpose**: URL for custom email service (if not using Supabase Auth emails)

**Format**: `https://your-email-service.com/api/send`

**Example**: `https://api.sendgrid.com/v3/mail/send`

**Required**: No (Supabase handles emails by default)

**Used by**:
- Custom email notifications
- Transactional emails

**Note**: Only needed if using external email service

---

#### VITE_EMAIL_FROM

**Purpose**: Default "from" email address for notifications

**Format**: Email address

**Example**: `noreply@ordax.com.br`

**Required**: No (uses Supabase default)

**Used by**:
- Email notifications
- System emails

---

### Feature Flags

#### VITE_ENABLE_MALWARE_SCAN

**Purpose**: Enable/disable malware scanning for uploaded files

**Format**: `true` or `false`

**Example**: `true`

**Required**: No

**Default**: `false`

**Used by**:
- File upload service
- Security validation

**Note**: Requires malware scanning service integration

---

#### VITE_ENABLE_REAL_TIME

**Purpose**: Enable/disable real-time updates

**Format**: `true` or `false`

**Example**: `true`

**Required**: No

**Default**: `true`

**Used by**:
- Payment dashboard
- Conversation updates
- Notification badges

---

#### VITE_MAX_FILE_SIZE_MB

**Purpose**: Maximum file size for uploads (in MB)

**Format**: Number

**Example**: `5`

**Required**: No

**Default**: `5`

**Used by**:
- File upload validation

---

#### VITE_MAX_FILES_PER_PAYMENT

**Purpose**: Maximum number of files per payment

**Format**: Number

**Example**: `5`

**Required**: No

**Default**: `5`

**Used by**:
- File upload validation

---

### Analytics

#### VITE_GA_MEASUREMENT_ID

**Purpose**: Google Analytics Measurement ID

**Format**: `G-XXXXXXXXXX`

**Example**: `G-ABC123DEF4`

**Where to find**:
1. Go to [Google Analytics](https://analytics.google.com)
2. Admin > Data Streams
3. Select your stream
4. Copy Measurement ID

**Required**: No

**Used by**:
- User analytics
- Event tracking

---

## Environment Files

### Development (.env.development)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-dev-anon-key
VITE_SUPABASE_PROJECT_ID=your-dev-project-id

# Optional
VITE_APP_VERSION=1.0.0-dev
VITE_ENABLE_REAL_TIME=true
VITE_MAX_FILE_SIZE_MB=5
VITE_MAX_FILES_PER_PAYMENT=5
```

### Production (.env.production)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-prod-anon-key
VITE_SUPABASE_PROJECT_ID=your-prod-project-id

# Error Tracking
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_APP_VERSION=1.0.0

# Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Features
VITE_ENABLE_MALWARE_SCAN=true
VITE_ENABLE_REAL_TIME=true
VITE_MAX_FILE_SIZE_MB=5
VITE_MAX_FILES_PER_PAYMENT=5
```

### Local Development (.env.local)

```bash
# Copy from .env.development and customize
# This file is gitignored and for local overrides only

VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key
```

## Setting Environment Variables

### Local Development

1. Create `.env.local` file in project root
2. Copy variables from `.env.development`
3. Update with your values
4. Restart dev server

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
```

### Vercel Deployment

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add each variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Environment: Production, Preview, Development

### Netlify Deployment

1. Go to Netlify Dashboard
2. Select your site
3. Go to Site settings > Build & deploy > Environment
4. Click "Edit variables"
5. Add each variable

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

# Build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Set env vars
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# ... rest of Dockerfile
```

```bash
# Build with args
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-key \
  -t ordax-app .
```

## Validation

### Runtime Validation

Add to `src/lib/env.ts`:

```typescript
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY'
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Call in main.tsx
validateEnv();
```

### Build-time Validation

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [
    {
      name: 'validate-env',
      config() {
        const required = [
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_PUBLISHABLE_KEY'
        ];
        
        const missing = required.filter(
          key => !process.env[key]
        );
        
        if (missing.length > 0) {
          throw new Error(
            `Missing environment variables: ${missing.join(', ')}`
          );
        }
      }
    }
  ]
});
```

## Security Best Practices

### ✅ Do

- Use different keys for development and production
- Store service role key securely (never in client code)
- Use environment-specific `.env` files
- Add `.env.local` to `.gitignore`
- Rotate keys periodically
- Use secret management tools for production
- Validate environment variables at startup

### ❌ Don't

- Commit `.env` files with real keys to git
- Expose service role key in client code
- Use production keys in development
- Share keys in plain text (email, chat)
- Log environment variables
- Use same keys across projects

## Troubleshooting

### "Missing environment variable" error

**Solution**:
1. Check `.env.local` file exists
2. Verify variable name matches exactly (case-sensitive)
3. Restart dev server after adding variables
4. Check for typos in variable names

### "Invalid Supabase URL" error

**Solution**:
1. Verify URL format: `https://[project-id].supabase.co`
2. Check for trailing slashes (remove them)
3. Ensure project is active in Supabase Dashboard

### "Authentication failed" error

**Solution**:
1. Verify anon key is correct
2. Check key hasn't expired
3. Ensure RLS policies are configured
4. Try regenerating keys in Supabase Dashboard

### Environment variables not updating

**Solution**:
1. Restart dev server
2. Clear browser cache
3. Check correct `.env` file is being used
4. Verify build process includes env vars

### Production deployment issues

**Solution**:
1. Verify all required vars set in hosting platform
2. Check variable names match exactly
3. Ensure no quotes around values (in most platforms)
4. Rebuild and redeploy after changing vars

## Reference

### Variable Naming Convention

- `VITE_*`: Client-side variables (exposed in browser)
- `SUPABASE_*`: Server-side variables (Edge Functions only)
- No prefix: Build-time only variables

### Access in Code

```typescript
// Client-side
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Server-side (Edge Functions)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
```

### Type Safety

Add to `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_EMAIL_SERVICE_URL?: string;
  readonly VITE_EMAIL_FROM?: string;
  readonly VITE_ENABLE_MALWARE_SCAN?: string;
  readonly VITE_ENABLE_REAL_TIME?: string;
  readonly VITE_MAX_FILE_SIZE_MB?: string;
  readonly VITE_MAX_FILES_PER_PAYMENT?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

**Last Updated**: 2026-02-15  
**Version**: 1.0.0  
**Maintainer**: Ordax Development Team
