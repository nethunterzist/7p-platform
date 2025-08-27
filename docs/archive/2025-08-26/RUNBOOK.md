# 7P Education - Production Runbook

> **⚠️ DEPRECATED**: Bu dokümantasyon arşivlenmiştir. 
> Güncel bilgi için: [docs/operations/RUNBOOK.md](../../../operations/RUNBOOK.md) sayfasına bakın.

## 🚀 Quick Start Guide

This runbook provides step-by-step instructions for setting up, deploying, and maintaining the 7P Education platform in production.

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Stripe account (for payments)
- Vercel account (for deployment)
- Domain name (optional, for production)

## 🛠️ Setup Instructions

### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Fill in required variables (see Environment Variables section below)
```

**Required Environment Variables:**
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres

# Authentication
NEXTAUTH_SECRET=your_32_character_secret_key
NEXTAUTH_URL=https://your-domain.com

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Link to your Supabase project
npm run db:link

# Run database migrations
npm run db:migrate

# Verify database setup
npm run db:verify

# (Optional) Seed with sample data
npm run db:seed
```

### 3. Development Server

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### 4. Testing

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🔧 Database Migration Guide

### Running Migrations

```bash
# Run pending migrations
npm run db:migrate

# Dry run (preview changes)
npm run db:migrate:dry

# Check migration status
npm run db:diff

# Reset database (DANGER - only for development)
npm run db:reset:confirm
```

### Creating New Migrations

```bash
# Create new migration file
npx supabase migration new your_migration_name

# Edit the generated SQL file in supabase/migrations/
# Test migration locally
npm run db:migrate:dry

# Apply migration
npm run db:migrate
```

### Migration Best Practices

1. **Always backup before migrations in production**
2. **Test migrations in staging environment first**
3. **Use transactions for atomic changes**
4. **Include rollback scripts for complex migrations**
5. **Document breaking changes**

## 📦 Deployment Guide

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
npm run deploy:vercel

# Or use Vercel dashboard with GitHub integration
```

### Pre-deployment Checklist

- [ ] All tests passing (`npm run test:all`)
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] Stripe webhooks configured
- [ ] Domain DNS configured (if using custom domain)
- [ ] SSL certificates active

### Post-deployment Verification

```bash
# Validate production deployment
npm run deploy:validate

# Test production endpoint
npm run deploy:test https://your-domain.com
```

## 🗄️ Database Management

### Backup Procedures

```bash
# Create database backup
pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup (set up as cron job)
# 0 2 * * * /path/to/backup-script.sh
```

### Monitoring Queries

```sql
-- Check database connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC;

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies WHERE schemaname = 'public';
```

### Performance Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_enrollments_user_course 
ON course_enrollments(user_id, course_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_material_progress_user_status 
ON user_material_progress(user_id, status);

-- Analyze table statistics
ANALYZE;
```

## 💳 Stripe Configuration

### Webhook Setup

1. **Create webhook endpoint in Stripe Dashboard:**
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `customer.subscription.created`, etc.

2. **Configure webhook secret:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

3. **Test webhook:**
   ```bash
   npm run test:stripe:webhook
   ```

### Payment Flow Testing

```bash
# Test Stripe integration
npm run test:stripe

# Use Stripe test cards:
# 4242424242424242 (Success)
# 4000000000000002 (Declined)
# 4000000000009995 (Insufficient funds)
```

## 📊 Monitoring & Logging

### Health Check Endpoint

```bash
# Check application health
curl https://your-domain.com/api/health

# Response should be:
# {"status": "healthy", "database": "connected", "timestamp": "..."}
```

### Performance Monitoring

1. **Supabase Dashboard:** Monitor database performance
2. **Vercel Analytics:** Track web vitals and performance
3. **Stripe Dashboard:** Monitor payment processing
4. **Sentry:** Error tracking and performance monitoring

### Log Analysis

```bash
# View Vercel function logs
vercel logs https://your-domain.com

# Check Supabase logs
# Via Supabase dashboard > Logs section
```

## 🔒 Security Checklist

### Pre-production Security Review

- [ ] All RLS policies implemented and tested
- [ ] Environment variables secured (no secrets in code)
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Authentication flows tested
- [ ] File upload restrictions enforced

### Security Monitoring

```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit

# Test authentication
npm run test:auth
```

## 🚨 Troubleshooting Guide

### Common Issues

**Database Connection Issues:**
```bash
# Test database connection
npm run db:verify

# Check connection string format
echo $SUPABASE_DB_URL

# Verify IP allowlisting in Supabase dashboard
```

**Authentication Issues:**
```bash
# Verify Supabase Auth configuration
# Check redirect URLs in Supabase dashboard
# Ensure NEXTAUTH_URL matches your domain
```

**Payment Issues:**
```bash
# Test Stripe configuration
npm run test:stripe

# Verify webhook endpoint is accessible
curl -X POST https://your-domain.com/api/webhooks/stripe

# Check Stripe dashboard for failed webhooks
```

**Performance Issues:**
```bash
# Run performance tests
npm run test:performance

# Check database query performance
npm run db:analyze

# Monitor Core Web Vitals in Vercel dashboard
```

### Error Recovery Procedures

**Database Recovery:**
```bash
# Restore from backup
psql $SUPABASE_DB_URL < backup_YYYYMMDD_HHMMSS.sql

# Run data integrity checks
npm run db:verify
```

**Cache Clear:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild application
npm run build
```

## 📈 Scaling Considerations

### Database Scaling

- Monitor connection pool usage
- Implement read replicas for heavy read workloads
- Consider database indexing for slow queries
- Set up automated backups with retention policy

### Application Scaling

- Use Vercel's auto-scaling capabilities
- Implement CDN for static assets
- Consider database connection pooling
- Monitor memory usage and optimize accordingly

### Storage Scaling

- Monitor Supabase Storage usage
- Implement file compression for large uploads
- Consider CDN for frequently accessed files
- Set up automated cleanup for temporary files

## 🔄 Maintenance Tasks

### Daily

- [ ] Check application health endpoint
- [ ] Monitor error rates in Sentry
- [ ] Review payment processing in Stripe
- [ ] Check database performance metrics

### Weekly

- [ ] Review user feedback and support tickets
- [ ] Analyze performance metrics and Core Web Vitals
- [ ] Check security alerts and updates
- [ ] Review backup integrity

### Monthly

- [ ] Update dependencies (`npm audit` and `npm update`)
- [ ] Review and rotate secrets/API keys
- [ ] Analyze user behavior and conversion metrics
- [ ] Plan feature releases and improvements

### Quarterly

- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Disaster recovery testing
- [ ] Infrastructure cost optimization

## 📞 Support Contacts

- **Technical Issues:** tech-team@7peducation.com
- **Database Issues:** database-admin@7peducation.com
- **Payment Issues:** finance@7peducation.com
- **Security Issues:** security@7peducation.com

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

**Last Updated:** $(date +"%Y-%m-%d")  
**Version:** 1.0.0  
**Maintainer:** 7P Education Development Team