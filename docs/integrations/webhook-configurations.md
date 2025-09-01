# 🔗 Webhook Configurations - Webhook Yapılandırmaları

## 📋 Genel Bakış

7P Education platformunda kullanılan tüm webhook yapılandırmaları ve event handling mekanizmaları.

## 💳 Payment Webhooks

### Stripe Webhooks
```typescript
interface StripeWebhookConfig {
  endpoint: string;
  secret: string;
  events: StripeWebhookEvent[];
  retryPolicy: RetryPolicy;
}

const stripeWebhookEvents = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed'
];

// Stripe Webhook Handler
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    await handleStripeWebhook(event);
    res.status(200).send('Webhook received');
    
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).send('Webhook signature verification failed');
  }
});

const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
      
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
      
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
};
```

### Payment Processing Logic
```typescript
const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const { userId, courseId } = session.metadata;
  
  try {
    // 1. Create course enrollment
    const enrollment = await createCourseEnrollment({
      userId,
      courseId,
      paymentIntentId: session.payment_intent as string,
      amount: session.amount_total,
      currency: session.currency,
      status: 'active'
    });
    
    // 2. Send confirmation email
    await sendEnrollmentConfirmationEmail(userId, courseId);
    
    // 3. Grant course access
    await grantCourseAccess(userId, courseId);
    
    // 4. Track analytics event
    await trackEvent('course_purchased', {
      userId,
      courseId,
      amount: session.amount_total,
      currency: session.currency
    });
    
    // 5. Add to CRM system
    await addToMarketingList(userId, 'enrolled_students');
    
  } catch (error) {
    // Log error and create manual review task
    await logWebhookError('checkout_completed', session.id, error);
    await createManualReviewTask('payment_processing', session.metadata);
  }
};
```

## 📧 Email & Communication Webhooks

### SendGrid Webhooks
```typescript
interface SendGridWebhookConfig {
  endpoint: '/api/webhooks/sendgrid';
  events: SendGridWebhookEvent[];
  authentication: 'basic_auth' | 'oauth';
}

const sendgridWebhookEvents = [
  'delivered',
  'opened',
  'clicked',
  'bounce',
  'dropped',
  'spam_report',
  'unsubscribe',
  'group_unsubscribe'
];

app.post('/api/webhooks/sendgrid', async (req, res) => {
  const events = req.body;
  
  for (const event of events) {
    await handleSendGridWebhook(event);
  }
  
  res.status(200).send('OK');
});

const handleSendGridWebhook = async (event: SendGridEvent) => {
  switch (event.event) {
    case 'delivered':
      await updateEmailStatus(event.sg_message_id, 'delivered', event.timestamp);
      break;
      
    case 'opened':
      await trackEmailOpen(event.email, event.sg_message_id, event.timestamp);
      await updateUserEngagement(event.email, 'email_opened');
      break;
      
    case 'clicked':
      await trackEmailClick(event.email, event.url, event.timestamp);
      await updateUserEngagement(event.email, 'email_clicked');
      break;
      
    case 'bounce':
      await handleEmailBounce(event.email, event.reason, event.type);
      break;
      
    case 'spam_report':
      await handleSpamReport(event.email, event.timestamp);
      await updateEmailReputation(event.email, 'spam_reported');
      break;
      
    case 'unsubscribe':
      await handleUnsubscribe(event.email, event.timestamp);
      await updateMarketingPreferences(event.email, { subscribed: false });
      break;
  }
};
```

## 📱 Push Notification Webhooks

### Firebase Cloud Messaging Callbacks
```typescript
interface FCMWebhookConfig {
  endpoint: '/api/webhooks/fcm';
  events: FCMWebhookEvent[];
}

const handleFCMDeliveryReceipt = async (receipt: FCMDeliveryReceipt) => {
  const { messageId, deviceToken, status, timestamp } = receipt;
  
  await updateNotificationStatus(messageId, {
    status: status, // 'delivered', 'failed', 'clicked'
    deviceToken,
    deliveredAt: timestamp
  });
  
  if (status === 'clicked') {
    await trackNotificationEngagement(messageId, deviceToken);
  }
  
  if (status === 'failed') {
    await handleNotificationFailure(messageId, deviceToken, receipt.error);
  }
};
```

## 🎥 Media Processing Webhooks

### Cloudinary Upload Webhooks
```typescript
interface CloudinaryWebhookConfig {
  endpoint: '/api/webhooks/cloudinary';
  notification_url: string;
  events: CloudinaryWebhookEvent[];
}

app.post('/api/webhooks/cloudinary', async (req, res) => {
  const { notification_type, public_id, version, format } = req.body;
  
  try {
    switch (notification_type) {
      case 'upload':
        await handleVideoUploadComplete(public_id, version, format);
        break;
        
      case 'transformation':
        await handleVideoTransformationComplete(public_id, req.body);
        break;
        
      case 'delete':
        await handleVideoDeleted(public_id);
        break;
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Cloudinary webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

const handleVideoUploadComplete = async (publicId: string, version: number, format: string) => {
  // Update lesson with video URL
  const videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v${version}/${publicId}.${format}`;
  
  await updateLessonVideo(publicId, {
    url: videoUrl,
    status: 'ready',
    processedAt: new Date()
  });
  
  // Generate video thumbnails
  await generateVideoThumbnails(publicId);
  
  // Create video transcripts (if enabled)
  await generateVideoTranscript(publicId);
  
  // Notify content creators
  await notifyVideoProcessingComplete(publicId);
};
```

## 🔐 Authentication Webhooks

### Supabase Auth Webhooks
```typescript
interface SupabaseAuthWebhookConfig {
  endpoint: '/api/webhooks/supabase-auth';
  secret: string;
  events: SupabaseAuthEvent[];
}

const supabaseAuthEvents = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.password.updated',
  'user.email.confirmed',
  'session.created',
  'session.deleted'
];

app.post('/api/webhooks/supabase-auth', async (req, res) => {
  const { event, data } = req.body;
  
  try {
    await handleSupabaseAuthWebhook(event, data);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Supabase auth webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

const handleSupabaseAuthWebhook = async (event: string, data: any) => {
  switch (event) {
    case 'user.created':
      await handleUserCreated(data.user);
      break;
      
    case 'user.email.confirmed':
      await handleEmailConfirmed(data.user);
      break;
      
    case 'user.deleted':
      await handleUserDeleted(data.user);
      break;
      
    case 'session.created':
      await trackUserLogin(data.session);
      break;
  }
};

const handleUserCreated = async (user: AuthUser) => {
  // Create user profile
  await createUserProfile({
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    emailVerified: false
  });
  
  // Send welcome email
  await sendWelcomeEmail(user.email);
  
  // Add to CRM
  await addToMarketingList(user.id, 'new_users');
  
  // Track signup event
  await trackEvent('user_signup', {
    userId: user.id,
    provider: user.app_metadata.provider,
    timestamp: new Date()
  });
};
```

## 📊 Analytics Webhooks

### Google Analytics Measurement Protocol
```typescript
interface GA4WebhookConfig {
  endpoint: '/api/webhooks/ga4';
  measurementId: string;
  apiSecret: string;
}

const sendGA4Event = async (eventData: GA4EventData) => {
  const payload = {
    client_id: eventData.clientId,
    events: [{
      name: eventData.eventName,
      parameters: eventData.parameters
    }]
  };
  
  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
  
  return response.ok;
};

// Course completion tracking
const trackCourseCompletion = async (userId: string, courseId: string) => {
  await sendGA4Event({
    clientId: userId,
    eventName: 'course_completion',
    parameters: {
      course_id: courseId,
      completion_time: new Date().toISOString(),
      value: 1
    }
  });
};
```

## 🔍 Search & Discovery Webhooks

### Algolia Index Update Webhooks
```typescript
interface AlgoliaWebhookConfig {
  endpoint: '/api/webhooks/algolia';
  applicationId: string;
  apiKey: string;
}

const updateAlgoliaIndex = async (action: 'create' | 'update' | 'delete', objectType: string, objectData: any) => {
  const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_API_KEY);
  const index = client.initIndex(`${objectType}s`);
  
  switch (action) {
    case 'create':
    case 'update':
      await index.saveObject(objectData);
      break;
      
    case 'delete':
      await index.deleteObject(objectData.id);
      break;
  }
};

// Course update webhook
app.post('/api/webhooks/course-updated', async (req, res) => {
  const { action, course } = req.body;
  
  // Update search index
  await updateAlgoliaIndex(action, 'course', {
    objectID: course.id,
    title: course.title,
    description: course.description,
    instructor: course.instructor,
    price: course.price,
    rating: course.rating,
    tags: course.tags
  });
  
  res.status(200).send('OK');
});
```

## 🚨 Error & Monitoring Webhooks

### Sentry Webhook Integration
```typescript
interface SentryWebhookConfig {
  endpoint: '/api/webhooks/sentry';
  secret: string;
  events: SentryWebhookEvent[];
}

app.post('/api/webhooks/sentry', async (req, res) => {
  const { action, data } = req.body;
  
  if (action === 'issue.created' && data.issue.level === 'error') {
    // High priority error - notify development team
    await notifyDevelopmentTeam({
      type: 'critical_error',
      issue: data.issue,
      project: data.project.name,
      url: data.issue.permalink
    });
    
    // Auto-create support ticket for user-facing errors
    if (data.issue.tags.some(tag => tag.key === 'user_facing')) {
      await createSupportTicket({
        type: 'technical_issue',
        priority: 'high',
        description: data.issue.title,
        context: data.issue.culprit
      });
    }
  }
  
  res.status(200).send('OK');
});
```

## 🔄 Webhook Reliability & Security

### Retry Logic
```typescript
interface WebhookRetryConfig {
  maxRetries: number;
  backoffStrategy: 'exponential' | 'linear';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

const defaultRetryConfig: WebhookRetryConfig = {
  maxRetries: 3,
  backoffStrategy: 'exponential',
  baseDelay: 1000,
  maxDelay: 30000
};

const processWebhookWithRetry = async (
  webhookHandler: Function,
  payload: any,
  config: WebhookRetryConfig = defaultRetryConfig
) => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      await webhookHandler(payload);
      return; // Success
    } catch (error) {
      lastError = error;
      
      if (attempt < config.maxRetries) {
        const delay = calculateBackoffDelay(attempt, config);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  await logWebhookFailure(payload, lastError);
  throw lastError;
};
```

### Webhook Security
```typescript
const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

const secureWebhookMiddleware = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(payload, signature, secret)) {
      return res.status(401).send('Unauthorized');
    }
    
    next();
  };
};
```

---

*Bu dokümantasyon, 7P Education platformunun tüm webhook yapılandırmalarını ve event handling mekanizmalarını kapsamaktadır.*