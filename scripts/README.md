# 🗃️ Scripts Directory - Production & Archive

## 📊 Directory Overview

This directory contains database and development scripts for the 7P Education Platform. Scripts are organized into **production scripts** (actively used) and **archived scripts** (development history).

## ✅ Production Scripts (Active)

These scripts are referenced in `package.json` and are part of the **automated Supabase migration system**:

| Script | NPM Command | Purpose | Status |
|--------|-------------|---------|--------|
| `test-supabase-connection.js` | `npm run supabase:test` | Test Supabase connectivity | ✅ Active |
| `deploy-schema.js` | `npm run supabase:deploy` | Deploy schema manually | ✅ Active |
| `database-reset-and-deploy.js` | `npm run db:reset` | Complete database reset | ✅ Active |
| `supabase-correct-setup.js` | `npm run db:setup` | Setup Supabase configuration | ✅ Active |
| `check-tables.js` | `npm run db:verify` | Verify 9-table architecture | ✅ Active |
| `seed.js` | `npm run db:seed` | Insert sample data | ✅ Active |
| `create-reviews-tables.js` | `npm run db:reviews` | Reviews table management | ✅ Active |
| `clean-database-fresh-start.js` | `npm run db:clean:confirm` | Complete database cleanup | ✅ Active |

## 📁 Archive Directory

The `archive/` directory contains **33 legacy scripts** from the development process before automated migration system was implemented. These scripts represent different approaches and experiments during the migration system development:

### Development History Scripts (Archived)
- **Database Reset Variants**: `auto-reset-db.js`, `clean-database.js`, `direct-sql-reset.js`, `drop-all-tables.js`, `force-clean-database.js`, `simple-database-reset.js`, `ultimate-drop-tables.js`
- **SQL Execution**: `execute-sql-direct.js`, `manual-sql-execution.js`, `programmatic-reset.js`
- **Setup Variants**: `supabase-api-setup.js`, `supabase-auto-setup.js`, `supabase-remote-setup.js`
- **Testing & Validation**: `test-db-connection.js`, `validate-course-system.js`, `validate-deployment.js`, `final-migration-test.js`
- **Data Management**: `sample-data-extractor.js`, `seed-course-data.js`, `apply-reviews-direct.js`, `apply-reviews-migration.js`
- **Analysis**: `analyze-database.js`, `comprehensive-db-analysis.js`, `comprehensive-data-integrity-validation.js`
- **Utilities**: `generate-jwt-secret.js`, `replace-supabase-imports.js`, `fix-mock-api-errors.js`

## 🎯 Current System Status

**Automated Migration System Active**: The 7P Education Platform now uses a production-ready automated migration system with:

- ✅ **Zero Manual SQL**: Developers use `npm run db:migrate` instead of writing raw SQL
- ✅ **Automated Validation**: `npm run db:verify` checks 9-table architecture
- ✅ **Environment Security**: dotenvx integration for secure Service Role Key loading
- ✅ **Production Ready**: Full CI/CD pipeline compatible

## 📚 Related Documentation

- **Migration System**: `docs/database/database-migration-strategy.md`
- **Security Guide**: `docs/database/database-security-guide.md`
- **Testing Workflow**: `docs/database/database-test-workflow.md`
- **Schema Documentation**: `docs/database/database-schema.md`

## 🧹 Archive Policy

**Why Scripts Were Archived**:
- Replaced by automated Supabase CLI migration system
- Multiple experimental approaches consolidated into production scripts
- Manual SQL execution scripts replaced by `npm run db:migrate`
- Development-only scripts not needed in production

**Archive Retention**:
- Scripts preserved for historical reference
- Can be restored if specific functionality needed
- Demonstrates development process and decision evolution

---

**Last Updated**: 19 August 2025, 18:45  
**System Status**: Production automated migration system active  
**Scripts Status**: 8 production scripts active, 33 legacy scripts archived