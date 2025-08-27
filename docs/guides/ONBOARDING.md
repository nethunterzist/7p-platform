# 7P Education - Quick Onboarding

> Projeyi 10 dakikada ayağa kaldır ve sık karşılaşılan problemleri çöz

## 🚀 10 Dakikalık Setup

## 1️⃣ Repository & Dependencies (2 dakika)
```bash
# Clone repository
git clone https://github.com/furkanyigit/7peducation.git
cd 7peducation

# Install dependencies
npm install
# or
yarn install
```

## 2️⃣ Environment Setup (3 dakika)
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local  # or your preferred editor
```

**Minimum Required Variables:**
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# NextAuth (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-character-secret-here

# Payment Mode (Optional)
PAYMENTS_MODE=disabled  # or "stripe" for production
```

## 3️⃣ Database Verification (2 dakika)
```bash
# Test Supabase connection
npm run db:verify

# Expected output:
# ✅ Supabase connection successful
# ✅ Tables found: 15+
# ✅ RLS policies active
```

## 4️⃣ Start Development Server (1 dakika)
```bash
# Start development server
npm run dev

# Server should start on http://localhost:3000
```

## 5️⃣ Smoke Test (2 dakika)
Open these URLs and verify they work:

1. **http://localhost:3000** → Should show landing page
2. **http://localhost:3000/login** → Should show login form
3. **http://localhost:3000/api/health** → Should return health JSON
4. **http://localhost:3000/courses** → Should show courses list

**Expected Health Response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "paymentsMode": "disabled",
  "checks": {
    "basic": true,
    "memory": true,
    "database": true
  }
}
```

## ✅ Sağlık Kontrolleri

### Temel Endpoint'ler
```bash
# System health
curl http://localhost:3000/api/health

# Diagnostics (development only)
curl http://localhost:3000/api/diag

# Basic connectivity
curl http://localhost:3000/api/ping
```

## Frontend Kontrolleri
- **Login Page**: Form görünüyor mu?
- **Courses**: Liste yükleniyor mu?
- **Console**: JavaScript hataları var mı?
- **Network**: API çağrıları başarılı mı?

### Database Kontrolleri
```bash
# Quick database test
npm run db:verify

# Check specific table
npm run supabase:test
```

## 🚨 Sık Karşılaşılan Problemler

### 1. Middleware 500 Hatası

**Semptom**: `/dashboard` veya korumalı sayfalarda 500 hatası

**Çözüm**:
```bash
# 1. Environment variables kontrolü
echo $NEXTAUTH_SECRET
echo $NEXT_PUBLIC_SUPABASE_URL

# 2. Middleware dosyası kontrol
cat src/middleware.ts

# 3. Session cookie kontrolü (browser dev tools)
# Application > Cookies > localhost:3000
# "next-auth.session-token" var mı?
```

**Fix**: Ensure environment variables are set and restart dev server

## 2. Database Connection Errors

**Semptom**: "Could not connect to Supabase" hatası

**Çözüm**:
```bash
# 1. Test connection
npm run db:verify

# 2. Check environment
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 3. Supabase project status
# Visit supabase.com dashboard
```

**Fix**: Verify Supabase project is active and keys are correct

## 3. NextAuth Login Issues

**Semptom**: Login formu çalışmıyor, session oluşmuyor

**Çözüm**:
```bash
# 1. Check NextAuth configuration
cat src/app/api/auth/[...nextauth]/route.ts

# 2. Verify environment
echo $NEXTAUTH_URL
echo $NEXTAUTH_SECRET

# 3. Test login endpoint
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Fix**: Ensure NEXTAUTH_URL matches your development URL

## 4. Payment System Issues

**Semptom**: Payment buttons not working

**Çözüm**:
```bash
# 1. Check payment mode
curl http://localhost:3000/api/health | grep paymentsMode

# Expected for development:
# "paymentsMode": "disabled"

# 2. If payments should be enabled:
echo 'PAYMENTS_MODE=stripe' >> .env.local
echo 'STRIPE_SECRET_KEY=sk_test_...' >> .env.local

# 3. Restart server
npm run dev
```

## 5. Winston Logger Errors

**Semptom**: "EACCES: permission denied, open 'logs/...'"

**Çözüm**:
```bash
# This is expected on Vercel/production
# Logger automatically falls back to console

# For local development:
mkdir -p logs
chmod 755 logs
```

**Fix**: Logger automatically handles this with console fallback

## 6. TypeScript Errors

**Semptom**: Build fails with TypeScript errors

**Çözüm**:
```bash
# 1. Check TypeScript version
npx tsc --version

# 2. Clear Next.js cache
rm -rf .next
npm run build

# 3. Type check manually
npx tsc --noEmit

# 4. Fix imports and types
npm run lint --fix
```

## 7. Performance Issues

**Semptom**: Slow loading, high memory usage

**Çözüm**:
```bash
# 1. Check memory usage
curl http://localhost:3000/api/health | grep memoryUsage

# 2. Profile build
npm run build -- --debug

# 3. Analyze bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

## 🔧 Development Tools

### Useful Commands
```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run lint            # Code linting
npm run type-check      # TypeScript check

# Database
npm run db:verify       # Test database connection
npm run supabase:test   # Full Supabase test
npm run db:migrate      # Run migrations

# Health & Monitoring
npm run ping-health     # Test health endpoint
npm run prod-smoke      # Production smoke test

# Documentation
npm run docs:check      # Validate documentation
npm run routemap:gen    # Update route map
npm run env:report      # Environment analysis
```

## Debug Mode
```bash
# Enable verbose logging
VERBOSE_LOGGING=true npm run dev

# Database debug mode
DEBUG=supabase:* npm run dev

# NextAuth debug
NEXTAUTH_DEBUG=true npm run dev
```

## Browser Debug
```javascript
// Open browser console and run:

// Check session
console.log(await fetch('/api/auth/session').then(r => r.json()));

// Test health
console.log(await fetch('/api/health').then(r => r.json()));

// Check payment mode
console.log(await fetch('/api/health').then(r => r.json()).then(d => d.paymentsMode));
```

## 🆘 Getting Help

### Documentation Quick Links
- 🔍 **Problem**: Check [OPERATIONS/RUNBOOK.md](./OPERATIONS/RUNBOOK.md)
- 🔐 **Auth Issues**: See [AUTH.md](./AUTH.md)
- 💳 **Payment Issues**: Read [PAYMENTS.md](./PAYMENTS.md)
- 🗺️ **Route Issues**: Review [ROUTEMAP.md](./ROUTEMAP.md)
- 🛡️ **Security Questions**: Check [SECURITY.md](./SECURITY.md)

### Log Files
```bash
# View application logs
npm run ping-health:watch

# Browser console logs
# Open DevTools > Console

# Vercel logs (production)
vercel logs --follow
```

## Community Support
1. **Check Issues**: GitHub repository issues
2. **Documentation**: Search in `docs/` folder
3. **Stack Overflow**: Tag with `nextjs`, `supabase`, `7p-education`

---

## ✅ Success Checklist

After setup, you should have:

- [ ] ✅ `npm run dev` starts without errors
- [ ] ✅ http://localhost:3000 shows landing page
- [ ] ✅ http://localhost:3000/api/health returns healthy status
- [ ] ✅ Login page loads and form is visible
- [ ] ✅ Database connection verified (`npm run db:verify`)
- [ ] ✅ No console errors in browser DevTools
- [ ] ✅ Environment variables properly configured

**Setup Time**: Should take ~10 minutes maximum

**Next Steps**: 
1. Read [CODEMAP.md](./CODEMAP.md) to understand the code structure
2. Explore [ROUTEMAP.md](./ROUTEMAP.md) to see all available routes
3. Check [ENVIRONMENT.md](./ENVIRONMENT.md) for advanced configuration

---

*Last updated: 2025-01-27*  
*Quick setup guide - for detailed docs see [DOC_INDEX.md](./DOC_INDEX.md)*