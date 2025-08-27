#!/bin/bash
# 7P Education - Vercel Environment Variables Import Script
# Imports environment variables from vercel.env.production to Vercel Production
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="ENV_IMPORT_LOG.md"
ENV_FILE="vercel.env.production"

# Initialize log
cat > "$LOG_FILE" << 'EOF'
# 🚀 Vercel Environment Variables Import Log

**Date**: $(date)
**Project**: 7p-platform
**Environment**: Production

## Import Results

EOF

echo -e "${BLUE}🚀 7P Education - Vercel ENV Import Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to mask secrets
mask_secret() {
    local value="$1"
    local length=${#value}
    
    if [ $length -le 10 ]; then
        echo "${value:0:3}***${value: -2}"
    else
        echo "${value:0:6}...${value: -4}"
    fi
}

# Function to log with masking
log_env_action() {
    local action="$1"
    local key="$2" 
    local value="$3"
    local masked=$(mask_secret "$value")
    
    echo "| $key | $action | $masked |" >> "$LOG_FILE"
    echo -e "${GREEN}✓${NC} $action $key: $masked"
}

# Function to log errors
log_error() {
    local key="$1"
    local error="$2"
    
    echo "| $key | ERROR | $error |" >> "$LOG_FILE"
    echo -e "${RED}✗${NC} ERROR with $key: $error"
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# 1. Check if ENV file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗${NC} Environment file $ENV_FILE not found!"
    echo "## Error" >> "$LOG_FILE"
    echo "Environment file $ENV_FILE not found. Please create it first." >> "$LOG_FILE"
    exit 1
fi

# 2. Check Vercel login status
if ! vercel whoami &>/dev/null; then
    echo -e "${YELLOW}⚠️${NC} Not logged into Vercel. Attempting login..."
    if ! vercel login; then
        echo -e "${RED}✗${NC} Failed to login to Vercel"
        echo "## Error" >> "$LOG_FILE"
        echo "Failed to login to Vercel. Please run 'vercel login' manually." >> "$LOG_FILE"
        exit 1
    fi
fi

# 3. Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}⚠️${NC} Project not linked. Linking to Vercel..."
    if ! vercel link --yes; then
        echo -e "${RED}✗${NC} Failed to link project"
        echo "## Error" >> "$LOG_FILE"
        echo "Failed to link project to Vercel." >> "$LOG_FILE"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Prerequisites checked successfully"

# Add table header to log
cat >> "$LOG_FILE" << 'EOF'

| Variable | Action | Value (Masked) |
|----------|--------|----------------|
EOF

# Process environment file
echo -e "${YELLOW}📝 Processing environment variables...${NC}"

processed_count=0
error_count=0
duplicate_service_key=""

while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "${line// }" ]] && continue
    
    # Extract key and value
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Validate critical variables
        if [ "$key" = "NEXTAUTH_URL" ] && [[ ! "$value" =~ https://7p-platform\.vercel\.app ]]; then
            echo -e "${YELLOW}⚠️${NC} NEXTAUTH_URL does not contain https://7p-platform.vercel.app"
            echo "| $key | WARNING | URL does not match expected domain |" >> "$LOG_FILE"
        fi
        
        # Handle SUPABASE_SERVICE_ROLE_KEY duplication
        if [ "$key" = "SUPABASE_SERVICE_ROLE_KEY" ]; then
            duplicate_service_key="$value"
        fi
        
        # Remove existing variable (if exists)
        vercel env remove "$key" production 2>/dev/null || true
        
        # Add new variable
        if printf '%s' "$value" | vercel env add "$key" production >/dev/null 2>&1; then
            log_env_action "ADDED" "$key" "$value"
            ((processed_count++))
        else
            log_error "$key" "Failed to add variable"
            ((error_count++))
        fi
        
    else
        echo -e "${YELLOW}⚠️${NC} Skipping malformed line: $line"
        echo "| MALFORMED | SKIPPED | $line |" >> "$LOG_FILE"
    fi
    
done < "$ENV_FILE"

# Add duplicate SUPABASE_SERVICE_KEY if we found SUPABASE_SERVICE_ROLE_KEY
if [ -n "$duplicate_service_key" ]; then
    echo -e "${YELLOW}🔄${NC} Adding duplicate SUPABASE_SERVICE_KEY..."
    vercel env remove "SUPABASE_SERVICE_KEY" production 2>/dev/null || true
    if printf '%s' "$duplicate_service_key" | vercel env add "SUPABASE_SERVICE_KEY" production >/dev/null 2>&1; then
        log_env_action "ADDED" "SUPABASE_SERVICE_KEY" "$duplicate_service_key"
        ((processed_count++))
    else
        log_error "SUPABASE_SERVICE_KEY" "Failed to add duplicate service key"
        ((error_count++))
    fi
fi

# Summary
echo -e "${BLUE}📊 Import Summary${NC}"
echo -e "${GREEN}✓${NC} Processed: $processed_count variables"
echo -e "${RED}✗${NC} Errors: $error_count variables"

# Add summary to log
cat >> "$LOG_FILE" << EOF

## Summary

- **Processed**: $processed_count variables
- **Errors**: $error_count variables
- **Status**: $([ $error_count -eq 0 ] && echo "✅ SUCCESS" || echo "⚠️ PARTIAL SUCCESS")

## Next Steps

EOF

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All environment variables imported successfully!${NC}"
    cat >> "$LOG_FILE" << 'EOF'
1. ✅ All variables imported successfully
2. 🚀 Ready for production deployment
3. 🔍 Validate with health check after deployment

EOF
else
    echo -e "${YELLOW}⚠️ Some variables failed to import. Check the log for details.${NC}"
    cat >> "$LOG_FILE" << 'EOF'
1. ⚠️ Some variables failed to import
2. 🔍 Review error messages above
3. 🔧 Fix issues and re-run script
4. 🚀 Deploy after resolving all errors

EOF
fi

# Add troubleshooting section
cat >> "$LOG_FILE" << 'EOF'
## Troubleshooting

### Common Issues:
- **Login Error**: Run `vercel login` manually
- **Project Not Linked**: Run `vercel link --yes`
- **Permission Error**: Check Vercel team permissions
- **Value Too Long**: Some secrets may exceed Vercel limits

### Manual Commands:
```bash
# Check current env vars
vercel env ls

# Remove specific variable
vercel env rm VARIABLE_NAME production

# Add variable manually
echo "VALUE" | vercel env add VARIABLE_NAME production
```

### Validation Commands:
```bash
# Test health endpoint
curl -s https://7p-platform.vercel.app/api/health

# Test payment disabled mode
curl -s -X POST https://7p-platform.vercel.app/api/payments/create-payment-intent
```

EOF

echo -e "${BLUE}📋 Log file created: $LOG_FILE${NC}"
echo -e "${YELLOW}🔄 Ready for deployment!${NC}"

exit $error_count