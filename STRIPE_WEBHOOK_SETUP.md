# 7P Education - Stripe Webhook Configuration Guide

**Date**: 2025-08-26  
**Purpose**: Complete Stripe webhook setup for production payment processing  
**Environment**: Production deployment  

**⚠️ PREREQUISITE**: Complete Vercel deployment and have your production URL ready

---

## 🎯 Overview

Stripe webhooks enable real-time payment event processing, allowing your application to:
- Process successful payments automatically
- Handle failed payment attempts
- Manage subscription lifecycle events
- Provide real-time payment status updates

### Webhook Flow
```
Stripe → Webhook Event → Your API → Database Update → User Notification
```

---

## 🚀 Step 1: Stripe Dashboard Configuration

### 1.1 Access Webhook Settings
1. **Login to Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to Webhooks**: Developers → Webhooks
3. **Click "Add endpoint"**

### 1.2 Webhook Endpoint Configuration
```yaml
endpoint_url: "https://your-production-domain.com/api/webhooks/stripe"
description: "7P Education Platform - Payment Processing"
api_version: "2023-10-16" (or latest)
```

**Important Notes**:
- Replace `your-production-domain.com` with your actual Vercel domain
- Use HTTPS (required by Stripe)
- Endpoint must be publicly accessible

### 1.3 Event Selection

#### Essential Events (Required)
Select these events for basic payment processing:

**Payment Processing Events**:
```yaml
checkout.session.completed:
  description: "Customer completed checkout"
  trigger: "When payment is successful"
  action: "Activate user access, send confirmation email"

payment_intent.succeeded:
  description: "Payment was successfully captured"
  trigger: "When payment processing completes"
  action: "Record successful payment, update order status"

payment_intent.payment_failed:
  description: "Payment attempt failed"
  trigger: "When payment cannot be processed"
  action: "Log failure, notify user, retry if applicable"
```

#### Subscription Events (If Using Subscriptions)
```yaml
customer.subscription.created:
  description: "New subscription created"
  trigger: "When user starts subscription"
  action: "Activate subscription benefits"

customer.subscription.updated:
  description: "Subscription modified"
  trigger: "When subscription changes (plan, status)"
  action: "Update user access level"

customer.subscription.deleted:
  description: "Subscription cancelled"
  trigger: "When subscription ends"
  action: "Remove subscription benefits"

invoice.payment_succeeded:
  description: "Subscription payment successful"
  trigger: "Monthly/yearly subscription renewal"
  action: "Extend subscription period"

invoice.payment_failed:
  description: "Subscription payment failed"
  trigger: "When renewal payment fails"
  action: "Send payment reminder, suspend access if needed"
```

#### Customer Events (Recommended)
```yaml
customer.created:
  description: "New customer record created"
  trigger: "First payment or registration"
  action: "Create customer profile, welcome email"

customer.updated:
  description: "Customer information updated"
  trigger: "Profile or payment method changes"
  action: "Sync customer data"
```

### 1.4 Create Endpoint
1. **Click "Add endpoint"**
2. **Copy the webhook signing secret** (starts with `whsec_`)
3. **Save this secret securely** - you'll need it for environment variables

---

## 🔐 Step 2: Environment Variable Configuration

### 2.1 Add Webhook Secret to Vercel
```bash
# Via Vercel Dashboard (Recommended)
# 1. Go to Project Settings → Environment Variables
# 2. Add new variable:
# Key: STRIPE_WEBHOOK_SECRET
# Value: whsec_1234567890abcdef... (from Stripe dashboard)
# Environment: Production

# Via Vercel CLI
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste your webhook secret when prompted
```

### 2.2 Verify Environment Variables
Ensure all required Stripe variables are set:
```bash
vercel env ls

# Required variables:
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# - STRIPE_SECRET_KEY  
# - STRIPE_WEBHOOK_SECRET (just added)
```

### 2.3 Redeploy Application
```bash
# Trigger new deployment for environment variables to take effect
git commit -m "Add Stripe webhook configuration" --allow-empty
git push origin main

# Or via Vercel CLI
vercel --prod
```

---

## 🧪 Step 3: Webhook Testing

### 3.1 Basic Connectivity Test
```bash
# Test webhook endpoint accessibility
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Expected Response: 400 Bad Request (signature required)
# This confirms the endpoint is accessible and validating signatures
```

### 3.2 Stripe Dashboard Test
1. **Go to Webhooks** in Stripe Dashboard
2. **Click your webhook endpoint**
3. **Click "Send test webhook"**
4. **Select event type**: `payment_intent.succeeded`
5. **Click "Send test webhook"**

**Expected Result**:
- Status: 200 OK
- Response time: < 2 seconds
- No errors in webhook logs

### 3.3 Check Application Logs
```bash
# Monitor Vercel function logs
vercel logs your-domain.com --tail

# Look for webhook processing logs:
# - "Webhook received: payment_intent.succeeded"
# - "Webhook processed successfully"
```

---

## 🔍 Step 4: Webhook Implementation Verification

### 4.1 Review Webhook Code
Your webhook handler is implemented in `src/app/api/webhooks/stripe/route.ts`. Key features:

#### Security Validation
```typescript
// Webhook signature verification
const signature = headers().get('stripe-signature');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe constructs and validates the event
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

#### Event Processing
```typescript
// Event type handling
switch (event.type) {
  case 'checkout.session.completed':
    // Handle successful checkout
    break;
  case 'payment_intent.succeeded':
    // Handle successful payment
    break;
  case 'payment_intent.payment_failed':
    // Handle failed payment
    break;
  // Additional events...
}
```

### 4.2 Database Integration
Verify webhook processing updates your Supabase database:

```sql
-- Check for webhook processing logs
SELECT * FROM webhook_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for payment records
SELECT * FROM payments 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 💳 Step 5: End-to-End Payment Testing

### 5.1 Test Payment Flow

#### Using Stripe Test Mode
If still in test mode, use these test card numbers:
```yaml
successful_payment:
  card: "4242 4242 4242 4242"
  expiry: "12/28"
  cvc: "123"
  expected: "Payment succeeds, webhook fires"

declined_payment:
  card: "4000 0000 0000 0002"
  expiry: "12/28" 
  cvc: "123"
  expected: "Payment fails, webhook fires"
```

#### Testing Steps
1. **Create test purchase** in your application
2. **Use test card** for payment
3. **Complete checkout process**
4. **Verify webhook reception** in Stripe Dashboard
5. **Check application response** (user access, email notifications)

### 5.2 Monitor Webhook Events
```bash
# Real-time webhook monitoring
vercel logs your-domain.com --tail | grep webhook

# Check webhook delivery in Stripe Dashboard
# Go to: Webhooks → Your endpoint → Recent deliveries
```

---

## 🛠️ Step 6: Production Validation

### 6.1 Switch to Live Mode
When ready for production payments:

1. **Update Stripe Keys**:
   ```bash
   # Replace test keys with live keys in Vercel environment variables
   # NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_live_...
   # STRIPE_SECRET_KEY: sk_live_...
   ```

2. **Create Live Webhook**:
   - Switch Stripe Dashboard to Live mode
   - Create new webhook endpoint with same configuration
   - Update STRIPE_WEBHOOK_SECRET with live webhook secret

3. **Test with Real Payment**:
   - Use real card for small amount ($0.50)
   - Verify complete payment flow
   - Confirm webhook processing

### 6.2 Monitoring Setup
```yaml
webhook_monitoring:
  success_rate: "> 99%"
  response_time: "< 2 seconds"
  error_alert: "Immediate notification"
  
stripe_dashboard:
  check: "Daily review of webhook deliveries"
  alerts: "Failed webhook notifications enabled"
  
application_logs:
  level: "INFO for successful webhooks, ERROR for failures"
  retention: "30 days"
  monitoring: "Automatic error detection"
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Issue 1: Webhook Returns 400 Error
```yaml
symptom: "Stripe webhook delivery fails with 400 status"
cause: "Signature verification failure"
solutions:
  - Verify STRIPE_WEBHOOK_SECRET is correctly set
  - Check webhook endpoint URL is exactly correct
  - Ensure application has been redeployed after setting secret
  - Verify webhook secret matches the specific endpoint
```

#### Issue 2: Webhook Timeout (30 seconds)
```yaml
symptom: "Webhook delivery times out"
cause: "Slow processing or infinite loops"
solutions:
  - Optimize database queries in webhook handler
  - Remove synchronous external API calls
  - Add timeout limits to external requests
  - Use background job processing for heavy tasks
```

#### Issue 3: Duplicate Event Processing
```yaml
symptom: "Same webhook event processed multiple times"
cause: "Webhook retries or race conditions"
solutions:
  - Implement idempotency keys
  - Check for existing records before processing
  - Use database transactions for atomic operations
  - Log processed event IDs to prevent duplicates
```

#### Issue 4: Events Not Being Received
```yaml
symptom: "No webhook events received"
cause: "Configuration or network issues"
debugging_steps:
  - Test endpoint accessibility with curl
  - Check Stripe Dashboard webhook logs
  - Verify endpoint URL in webhook configuration
  - Check Vercel function logs for errors
  - Ensure webhook endpoint is publicly accessible
```

### Debugging Commands
```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{}'

# Check webhook deliveries in Stripe
# Navigate to: Dashboard → Webhooks → Your endpoint → Recent deliveries

# Monitor application logs
vercel logs your-domain.com --since 1h | grep -i stripe

# Test environment variables
vercel env ls | grep STRIPE
```

---

## 📊 Performance & Monitoring

### Webhook Performance Targets
```yaml
response_time: "< 2 seconds"
success_rate: "> 99%"
error_rate: "< 0.1%"
processing_delay: "< 5 seconds from Stripe event"
```

### Monitoring Checklist
```yaml
daily:
  - [ ] Review webhook delivery success rate
  - [ ] Check for failed payment processing
  - [ ] Verify user access updates are working
  
weekly:
  - [ ] Analyze webhook performance metrics
  - [ ] Review error patterns and resolution
  - [ ] Test webhook with small live payment
  
monthly:
  - [ ] Audit webhook security configuration
  - [ ] Review and rotate webhook secrets
  - [ ] Test disaster recovery procedures
```

### Alert Configuration
```yaml
immediate_alerts:
  - Webhook success rate < 95%
  - Payment processing failures
  - Webhook endpoint returning 500 errors
  - Stripe API key authentication failures

warning_alerts:
  - Webhook response time > 5 seconds
  - Unusual webhook event patterns
  - Failed subscription payments
```

---

## 🔐 Security Considerations

### Webhook Security Checklist
```yaml
signature_validation:
  - [ ] Webhook signature verification implemented
  - [ ] Secret stored securely in environment variables
  - [ ] No webhook processing without valid signature

endpoint_security:
  - [ ] HTTPS only (no HTTP)
  - [ ] Rate limiting implemented
  - [ ] Input validation on all webhook data
  - [ ] No sensitive data logged

data_handling:
  - [ ] Webhook events processed idempotently
  - [ ] Customer data handled according to privacy policies
  - [ ] PCI compliance maintained for payment data
  - [ ] Audit trail for all payment processing
```

### Security Best Practices
1. **Never skip signature verification**
2. **Process webhooks idempotently**
3. **Log events but not sensitive data**
4. **Use HTTPS for all webhook endpoints**
5. **Regularly rotate webhook secrets**
6. **Monitor for suspicious webhook patterns**

---

## 📋 Deployment Checklist

### Pre-Production Checklist
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] All required events selected
- [ ] STRIPE_WEBHOOK_SECRET environment variable set
- [ ] Application redeployed with webhook secret
- [ ] Webhook endpoint accessibility tested
- [ ] Test webhook sent successfully from Stripe
- [ ] Application logs show successful webhook processing

### Post-Production Checklist
- [ ] Live webhook endpoint configured (when using live keys)
- [ ] Real payment test completed successfully
- [ ] Webhook monitoring alerts configured
- [ ] Team trained on webhook troubleshooting
- [ ] Documentation updated with production details

---

## 📞 Support & Resources

### Stripe Resources
- **Webhook Testing**: https://dashboard.stripe.com/test/webhooks
- **Event Types Reference**: https://stripe.com/docs/api/events/types
- **Webhook Best Practices**: https://stripe.com/docs/webhooks/best-practices
- **Webhook Security**: https://stripe.com/docs/webhooks/signatures

### Debugging Resources
```yaml
stripe_cli:
  install: "brew install stripe/stripe-cli/stripe"
  login: "stripe login"
  listen: "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
  
webhook_logs:
  vercel: "vercel logs your-domain.com --tail"
  stripe: "Dashboard → Webhooks → Recent deliveries"
  
testing_tools:
  postman: "Import Stripe webhook collection"
  curl: "Command-line webhook testing"
```

---

**Setup Status**: 🎯 **READY FOR CONFIGURATION**  
**Last Updated**: 2025-08-26  
**Configuration Version**: 1.0  
**Next Step**: Configure webhook endpoint in Stripe Dashboard