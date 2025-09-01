# 🔗 Third-Party API Integrations - Dış Servis Entegrasyonları

## 📋 Genel Bakış

7P Education platformunda kullanılan tüm dış servis entegrasyonları ve API bağlantıları.

## 💳 Payment Integrations

### Stripe API Integration
```typescript
interface StripeIntegration {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion: '2023-10-16';
  endpoints: {
    createPaymentIntent: '/v1/payment_intents';
    createCustomer: '/v1/customers';
    createSubscription: '/v1/subscriptions';
    handleWebhook: '/v1/webhooks';
  };
}

const stripeConfig = {
  baseURL: 'https://api.stripe.com',
  timeout: 30000,
  retryAttempts: 3,
  rateLimits: {
    requests: 100,
    window: 60000 // 1 dakika
  }
};

// Stripe Client Setup
const initializeStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
    timeout: 30000,
    maxNetworkRetries: 3
  });
};
```

### Payment Method Integrations
```typescript
interface PaymentProviders {
  stripe: StripeConfig;
  paypal?: PayPalConfig;
  klarna?: KlarnaConfig;
  applePay?: ApplePayConfig;
  googlePay?: GooglePayConfig;
}

const paymentMethods = {
  // Kredi/Banka Kartları
  cards: ['visa', 'mastercard', 'american_express'],
  
  // Digital Wallets
  wallets: ['apple_pay', 'google_pay', 'samsung_pay'],
  
  // Bank Transfers
  bankTransfers: ['sepa_debit', 'ach_direct_debit'],
  
  // Buy Now Pay Later
  bnpl: ['klarna', 'afterpay', 'affirm']
};
```

## 📧 Communication Services

### Email Service Integration
```typescript
interface EmailProviders {
  primary: 'sendgrid' | 'mailgun' | 'aws_ses';
  backup: 'sendgrid' | 'mailgun' | 'aws_ses';
  transactional: EmailConfig;
  marketing: EmailConfig;
}

// SendGrid Configuration
const sendgridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  baseURL: 'https://api.sendgrid.com/v3',
  templates: {
    welcome: 'd-1234567890abcdef',
    enrollment: 'd-abcdef1234567890',
    completion: 'd-567890abcdef1234',
    payment: 'd-cdef1234567890ab'
  },
  rateLimits: {
    requests: 600,
    window: 60000 // 1 dakika
  }
};

const sendTransactionalEmail = async (emailData: TransactionalEmail) => {
  const msg = {
    to: emailData.recipient,
    from: process.env.FROM_EMAIL,
    templateId: sendgridConfig.templates[emailData.type],
    dynamicTemplateData: emailData.data,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  };
  
  return await sgMail.send(msg);
};
```

### SMS Service Integration
```typescript
interface SMSProviders {
  primary: 'twilio' | 'aws_sns';
  backup: 'twilio' | 'aws_sns';
  config: SMSConfig;
}

// Twilio Configuration
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER,
  baseURL: 'https://api.twilio.com/2010-04-01',
  rateLimits: {
    requests: 100,
    window: 60000
  }
};

const sendSMS = async (phoneNumber: string, message: string) => {
  const client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
  
  return await client.messages.create({
    body: message,
    from: twilioConfig.fromNumber,
    to: phoneNumber,
    statusCallback: `${process.env.DOMAIN}/api/webhooks/twilio/status`
  });
};
```

## 📊 Analytics & Tracking

### Google Analytics 4 Integration
```typescript
interface GA4Integration {
  measurementId: string;
  apiSecret: string;
  events: GA4EventConfig;
  ecommerce: GA4EcommerceConfig;
}

const ga4Config = {
  measurementId: process.env.GA4_MEASUREMENT_ID,
  apiSecret: process.env.GA4_API_SECRET,
  baseURL: 'https://www.google-analytics.com/mp/collect',
  debugURL: 'https://www.google-analytics.com/debug/mp/collect'
};

// Custom Events Tracking
const trackCustomEvent = async (eventData: GA4Event) => {
  const payload = {
    client_id: eventData.clientId,
    events: [{
      name: eventData.name,
      parameters: {
        ...eventData.parameters,
        engagement_time_msec: eventData.engagementTime || 100
      }
    }]
  };
  
  return await fetch(`${ga4Config.baseURL}?measurement_id=${ga4Config.measurementId}&api_secret=${ga4Config.apiSecret}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
```

### Hotjar Integration
```typescript
const hotjarConfig = {
  siteId: process.env.HOTJAR_SITE_ID,
  version: 6,
  trackingCode: `
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:${process.env.HOTJAR_SITE_ID},hjv:6};
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  `,
  events: {
    courseEnrollment: 'course_enrollment',
    lessonCompletion: 'lesson_completion',
    quizAttempt: 'quiz_attempt',
    paymentSuccess: 'payment_success'
  }
};
```

## 🎥 Media & CDN Services

### AWS S3 & CloudFront Integration
```typescript
interface AWSConfig {
  s3: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  cloudfront: {
    distributionId: string;
    domain: string;
  };
}

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.S3_BUCKET_NAME,
  buckets: {
    videos: 'your-app-videos',
    images: 'your-app-images',
    documents: 'your-app-documents',
    backups: 'your-app-backups'
  }
};

const uploadToS3 = async (file: File, folder: string): Promise<S3UploadResult> => {
  const s3 = new AWS.S3(s3Config);
  
  const params = {
    Bucket: s3Config.buckets[folder] || s3Config.bucket,
    Key: `${folder}/${Date.now()}-${file.name}`,
    Body: file,
    ContentType: file.type,
    ACL: 'public-read'
  };
  
  const result = await s3.upload(params).promise();
  
  return {
    url: result.Location,
    key: result.Key,
    bucket: result.Bucket,
    cdnUrl: `https://${cloudfront.domain}/${result.Key}`
  };
};
```

### Video Processing Integration
```typescript
interface VideoProcessing {
  provider: 'aws_elemental' | 'cloudinary' | 'vimeo';
  config: VideoConfig;
  outputs: VideoOutputConfig[];
}

// Cloudinary Video Processing
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  videoFormats: ['mp4', 'webm', 'ogg'],
  qualities: ['240p', '360p', '480p', '720p', '1080p']
};

const processVideo = async (videoFile: File): Promise<VideoProcessingResult> => {
  const uploadResult = await cloudinary.v2.uploader.upload(videoFile.path, {
    resource_type: 'video',
    folder: 'course-videos',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { streaming_profile: 'full_hd' }
    ]
  });
  
  return {
    publicId: uploadResult.public_id,
    url: uploadResult.secure_url,
    duration: uploadResult.duration,
    formats: uploadResult.formats,
    sizes: uploadResult.bytes,
    playbackUrls: generatePlaybackUrls(uploadResult.public_id)
  };
};
```

## 🔐 Authentication Services

### OAuth Provider Integrations
```typescript
interface OAuthProviders {
  google: GoogleOAuthConfig;
  microsoft: MicrosoftOAuthConfig;
  linkedin: LinkedInOAuthConfig;
  github: GitHubOAuthConfig;
}

const oauthConfigs = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${process.env.DOMAIN}/auth/callback/google`,
    scopes: ['openid', 'email', 'profile'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token'
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: `${process.env.DOMAIN}/auth/callback/microsoft`,
    scopes: ['openid', 'email', 'profile'],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  }
};
```

## 📱 Push Notification Services

### Firebase Cloud Messaging (FCM)
```typescript
interface FCMConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  serverKey: string;
}

const fcmConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  serverKey: process.env.FCM_SERVER_KEY,
  vapidKey: process.env.FIREBASE_VAPID_KEY
};

const sendPushNotification = async (notification: PushNotification) => {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/icons/notification-icon.png'
    },
    data: notification.data,
    token: notification.deviceToken
  };
  
  return await admin.messaging().send(message);
};
```

## 🔍 Search & Discovery

### Algolia Search Integration
```typescript
interface AlgoliaConfig {
  applicationId: string;
  apiKey: string;
  searchOnlyApiKey: string;
  indices: AlgoliaIndices;
}

const algoliaConfig = {
  applicationId: process.env.ALGOLIA_APPLICATION_ID,
  apiKey: process.env.ALGOLIA_API_KEY,
  searchOnlyApiKey: process.env.ALGOLIA_SEARCH_ONLY_API_KEY,
  indices: {
    courses: 'courses',
    lessons: 'lessons',
    instructors: 'instructors',
    users: 'users'
  }
};

const searchCourses = async (query: string, filters?: SearchFilters) => {
  const client = algoliasearch(algoliaConfig.applicationId, algoliaConfig.searchOnlyApiKey);
  const index = client.initIndex(algoliaConfig.indices.courses);
  
  const searchParams = {
    query,
    filters: buildAlgoliaFilters(filters),
    hitsPerPage: 20,
    attributesToRetrieve: ['title', 'description', 'instructor', 'price', 'rating'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>'
  };
  
  return await index.search(searchParams);
};
```

## 🎯 Marketing & CRM

### Mailchimp Integration
```typescript
const mailchimpConfig = {
  apiKey: process.env.MAILCHIMP_API_KEY,
  serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX, // us1, us2, etc.
  listId: process.env.MAILCHIMP_LIST_ID,
  baseURL: `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0`
};

const subscribeToNewsletter = async (email: string, userData: UserData) => {
  const response = await fetch(`${mailchimpConfig.baseURL}/lists/${mailchimpConfig.listId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mailchimpConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: userData.firstName,
        LNAME: userData.lastName,
        COMPANY: userData.company
      },
      tags: ['platform-user', 'course-interested']
    })
  });
  
  return await response.json();
};
```

## 🚨 Error Tracking & Monitoring

### Sentry Integration
```typescript
const sentryConfig = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  integrations: [
    new Integrations.Http({ tracing: true }),
    new Integrations.Express({ app: express() }),
    new Integrations.Postgres()
  ]
};

// Initialize Sentry
Sentry.init(sentryConfig);

// Custom Error Tracking
const trackError = (error: Error, context?: ErrorContext) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setTag('section', context.section);
      scope.setContext('user', context.user);
      scope.setLevel('error');
    }
    Sentry.captureException(error);
  });
};
```

## ⚡ Performance Monitoring

### DataDog Integration
```typescript
const datadogConfig = {
  apiKey: process.env.DATADOG_API_KEY,
  appKey: process.env.DATADOG_APP_KEY,
  site: 'datadoghq.com',
  service: '7p-education',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION
};

const trackMetric = (metricName: string, value: number, tags?: string[]) => {
  const metric = {
    metric: metricName,
    points: [[Date.now() / 1000, value]],
    tags: [`env:${datadogConfig.env}`, `service:${datadogConfig.service}`, ...tags]
  };
  
  fetch(`https://api.${datadogConfig.site}/api/v1/series`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': datadogConfig.apiKey
    },
    body: JSON.stringify({ series: [metric] })
  });
};
```

---

*Bu dokümantasyon, 7P Education platformunun tüm dış servis entegrasyonlarını ve API bağlantılarını kapsamaktadır.*