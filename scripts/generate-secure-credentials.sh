#!/bin/bash

# 🔐 Secure Credential Generation Script
# 7P Education Platform - Emergency Security Response
# 
# Usage: ./scripts/generate-secure-credentials.sh

set -e

echo "🔐 7P Education - Security Credential Generator"
echo "=============================================="
echo ""
echo "⚠️  CRITICAL: This script generates new security credentials"
echo "⚠️  Use immediately for emergency credential rotation"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate cryptographically secure secrets
echo "${YELLOW}Generating new security credentials...${NC}"
echo ""

# JWT Secret (512-bit for maximum security)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "🔑 NEW JWT_SECRET:"
echo "${GREEN}${JWT_SECRET}${NC}"
echo ""

# NextAuth Secret (256-bit)
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "🔑 NEW NEXTAUTH_SECRET:"
echo "${GREEN}${NEXTAUTH_SECRET}${NC}"
echo ""

# Database Password (20 chars, secure)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/\n" | cut -c1-20)
echo "🔑 NEW DATABASE PASSWORD:"
echo "${GREEN}${DB_PASSWORD}${NC}"
echo ""

# Session Secret (for additional security)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "🔑 NEW SESSION_SECRET:"
echo "${GREEN}${SESSION_SECRET}${NC}"
echo ""

# CSRF Secret
CSRF_SECRET=$(openssl rand -base64 16 | tr -d '\n')
echo "🔑 NEW CSRF_SECRET:"
echo "${GREEN}${CSRF_SECRET}${NC}"
echo ""

echo "=============================================="
echo "${RED}⚠️  CRITICAL SECURITY INSTRUCTIONS${NC}"
echo "=============================================="
echo ""
echo "1. ${YELLOW}IMMEDIATELY${NC} update these credentials in:"
echo "   - .env.production"
echo "   - .env.local (use different values for dev)"  
echo "   - Vercel environment variables"
echo "   - Supabase Dashboard settings"
echo ""
echo "2. ${YELLOW}NEVER${NC} commit these secrets to version control"
echo ""
echo "3. ${YELLOW}TEST${NC} authentication after updating"
echo ""
echo "4. ${YELLOW}REVOKE${NC} old credentials in Supabase Dashboard"
echo ""
echo "5. ${YELLOW}MONITOR${NC} logs for failed authentication attempts"
echo ""

# Create a secure template file
TEMPLATE_FILE=".env.credentials-$(date +%Y%m%d-%H%M%S)"
cat > "$TEMPLATE_FILE" << EOF
# 🔐 GENERATED SECURE CREDENTIALS - $(date)
# ⚠️  CONFIDENTIAL: Do not commit to version control

# Authentication
JWT_SECRET=${JWT_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Database (update connection string with new password)
# OLD: postgresql://postgres.riupkkggupogdgubnhmy:Furkan1453%40%40@...
# NEW: postgresql://postgres.riupkkggupogdgubnhmy:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require

# Security Configuration
ENABLE_EMAIL_VERIFICATION=true
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
ENABLE_SECURITY_HEADERS=true

# Production Security Headers
SECURITY_HEADERS_ENABLED=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

# Generation Details
GENERATED_DATE=$(date)
ROTATION_DUE_DATE=$(date -d '+90 days' 2>/dev/null || date -v +90d 2>/dev/null || echo "Manual calculation needed")
EOF

echo "6. ${GREEN}SAVED${NC} template file: ${TEMPLATE_FILE}"
echo "   Use this template to update your environment files"
echo ""
echo "=============================================="
echo "${GREEN}✅ Credential generation complete${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Read: scripts/security-credential-rotation.md"
echo "2. Update database password in Supabase Dashboard"  
echo "3. Update service role key in Supabase Dashboard"
echo "4. Apply new credentials to environment files"
echo "5. Deploy updated application"
echo "6. Test authentication flows"
echo ""
echo "${YELLOW}⏰ URGENT: Complete rotation within 1 hour${NC}"